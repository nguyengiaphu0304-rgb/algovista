import assert from "node:assert/strict";
import test from "node:test";

import {
  exportTraceArtifact,
  importTraceArtifact,
  MAX_TRACE_ARTIFACT_BYTES,
  replayGraphTrace,
  replayTrace,
  type TraceArtifact,
  TraceValidationError,
  traceBinarySearch,
  traceBreadthFirstSearch,
  traceMergeSort,
} from "../src/index.js";

function canonical(value: unknown): string {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  assert.equal(typeof value, "object");
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
    .join(",")}}`;
}

async function digest(text: string): Promise<string> {
  const value = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function resign(envelope: Record<string, unknown>): Promise<string> {
  envelope.sha256 = await digest(canonical(envelope.payload));
  return canonical(envelope);
}

test("array and graph traces round-trip deterministically into frozen verified objects", async () => {
  const artifacts: TraceArtifact[] = [
    traceMergeSort([3, -1, 3, 0]),
    traceBinarySearch([-1, 2, 2, 9], 2),
    traceBreadthFirstSearch(
      {
        directed: false,
        nodes: ["C", "A", "B"],
        edges: [
          ["A", "B"],
          ["A", "C"],
        ],
      },
      "A",
    ),
  ];
  for (const source of artifacts) {
    const first = await exportTraceArtifact(source);
    const second = await exportTraceArtifact(source);
    assert.equal(first, second);
    assert.equal(first.includes("\n"), false);
    const imported = await importTraceArtifact(first);
    assert(Object.isFrozen(imported));
    assert(Object.isFrozen(imported.steps));
    if (imported.algorithm === "merge-sort" || imported.algorithm === "binary-search") {
      assert.deepEqual(replayTrace(imported.steps).finalSnapshot, imported.steps.at(-1)?.snapshot);
    } else {
      assert.deepEqual(replayGraphTrace(imported).order, imported.order);
    }
    assert.equal(await exportTraceArtifact(imported), first);
  }
});

test("import rejects malformed, non-canonical, truncated, unknown, and oversized artifacts", async () => {
  const valid = await exportTraceArtifact(traceMergeSort([2, 1]));
  await assert.rejects(() => importTraceArtifact(""), TraceValidationError);
  await assert.rejects(() => importTraceArtifact(`${valid}\n`), /canonical/);
  await assert.rejects(() => importTraceArtifact(valid.slice(0, -1)), /valid JSON/);
  await assert.rejects(
    () => importTraceArtifact(" ".repeat(MAX_TRACE_ARTIFACT_BYTES + 1)),
    /UTF-8 bytes/,
  );
  const unknown = JSON.parse(valid) as Record<string, unknown>;
  unknown.injected = true;
  await assert.rejects(() => importTraceArtifact(canonical(unknown)), /unknown fields/);
  const unsupported = JSON.parse(valid) as Record<string, unknown>;
  unsupported.formatVersion = 99;
  const unsupportedText = await resign(unsupported);
  await assert.rejects(() => importTraceArtifact(unsupportedText), /version is unsupported/);
});

test("SHA-256 detects payload changes and is not treated as publisher authentication", async () => {
  const valid = await exportTraceArtifact(traceBinarySearch([1, 2, 2], 2));
  const modified = JSON.parse(valid) as {
    payload: { trace: { resultIndex: number } };
    sha256: string;
  };
  modified.payload.trace.resultIndex = 2;
  await assert.rejects(() => importTraceArtifact(canonical(modified)), /SHA-256/);

  const resigned = await resign(modified as unknown as Record<string, unknown>);
  await assert.rejects(() => importTraceArtifact(resigned), /result or target/);
});

test("strict schema reconstruction rejects result, step, graph, and field tampering", async () => {
  const sorted = JSON.parse(await exportTraceArtifact(traceMergeSort([3, 1, 2]))) as {
    payload: { trace: { output: number[]; steps: Array<Record<string, unknown>> } };
  };
  sorted.payload.trace.output = [1, 2, 99];
  const sortedText = await resign(sorted as unknown as Record<string, unknown>);
  await assert.rejects(() => importTraceArtifact(sortedText), /output does not match/);

  const extraStepField = JSON.parse(await exportTraceArtifact(traceMergeSort([2, 1]))) as {
    payload: { trace: { steps: Array<Record<string, unknown>> } };
  };
  const firstStep = extraStepField.payload.trace.steps[0];
  assert(firstStep);
  firstStep.injected = true;
  const extraStepText = await resign(extraStepField as unknown as Record<string, unknown>);
  await assert.rejects(() => importTraceArtifact(extraStepText), /unknown fields/);

  const graph = JSON.parse(
    await exportTraceArtifact(
      traceBreadthFirstSearch({ directed: false, nodes: ["A", "B"], edges: [["A", "B"]] }, "A"),
    ),
  ) as { payload: { trace: { order: string[] } } };
  graph.payload.trace.order = ["A"];
  const graphText = await resign(graph as unknown as Record<string, unknown>);
  await assert.rejects(() => importTraceArtifact(graphText), /forged traversal order/);
});

test("export rejects unsupported values, cycles, and non-finite numbers", async () => {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  await assert.rejects(
    () => exportTraceArtifact(cycle as unknown as TraceArtifact),
    /unsupported|cycle/,
  );
  const invalid = traceMergeSort([1]);
  const forged = { ...invalid, output: [Number.NaN] };
  await assert.rejects(() => exportTraceArtifact(forged as TraceArtifact), /non-finite/);
});
