import { replayGraphTrace } from "./graph-replay.js";
import {
  GRAPH_TRACE_SCHEMA_VERSION,
  type GraphInput,
  type GraphTrace,
  type GraphTraceStep,
} from "./graph-types.js";
import { normalizeGraph } from "./graph-validation.js";
import { replayTrace } from "./replay.js";
import {
  MAX_TRACE_STEPS,
  type SearchTrace,
  type SortTrace,
  TRACE_SCHEMA_VERSION,
  type TraceMetadata,
  type TraceStep,
} from "./types.js";
import { TraceValidationError } from "./validation.js";

export const TRACE_ARTIFACT_FORMAT = "algovista-trace" as const;
export const TRACE_ARTIFACT_VERSION = 1 as const;
export const MAX_TRACE_ARTIFACT_BYTES = 1_048_576;
const MAX_STRUCTURE_DEPTH = 32;
const MAX_STRUCTURE_VALUES = 200_000;

export type TraceArtifact = SortTrace | SearchTrace | GraphTrace;
export type TraceArtifactKind = "array" | "graph";

type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type UnknownRecord = Record<string, unknown>;

function canonicalJson(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TraceValidationError("trace artifact contains a non-finite number");
    }
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== "object") {
    throw new TraceValidationError("trace artifact contains an unsupported value");
  }
  if (seen.has(value)) {
    throw new TraceValidationError("trace artifact contains a cycle");
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => canonicalJson(item, seen)).join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TraceValidationError("trace artifact objects must be plain records");
    }
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key], seen)}`,
      )
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function encodedBytes(text: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(text);
  if (new TextDecoder().decode(encoded) !== text) {
    throw new TraceValidationError("trace artifact text is not well-formed Unicode");
  }
  return encoded;
}

async function sha256(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new TraceValidationError("Web Crypto SHA-256 is unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encodedBytes(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function artifactKind(trace: TraceArtifact): TraceArtifactKind {
  return trace.algorithm === "breadth-first-search" || trace.algorithm === "depth-first-search"
    ? "graph"
    : "array";
}

export async function exportTraceArtifact(trace: TraceArtifact): Promise<string> {
  assertStructureBounds(trace);
  const payload = { kind: artifactKind(trace), trace } satisfies {
    readonly kind: TraceArtifactKind;
    readonly trace: TraceArtifact;
  };
  const payloadText = canonicalJson(payload);
  const envelope = {
    format: TRACE_ARTIFACT_FORMAT,
    formatVersion: TRACE_ARTIFACT_VERSION,
    payload,
    sha256: await sha256(payloadText),
  };
  const text = canonicalJson(envelope);
  if (encodedBytes(text).byteLength > MAX_TRACE_ARTIFACT_BYTES) {
    throw new TraceValidationError(
      `trace artifact exceeds ${MAX_TRACE_ARTIFACT_BYTES} UTF-8 bytes`,
    );
  }
  return text;
}

function assertStructureBounds(value: unknown): void {
  const pending: Array<{ readonly depth: number; readonly value: unknown }> = [{ depth: 0, value }];
  const seen = new Set<object>();
  let count = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      break;
    }
    count += 1;
    if (count > MAX_STRUCTURE_VALUES || current.depth > MAX_STRUCTURE_DEPTH) {
      throw new TraceValidationError("trace artifact structure exceeds safe limits");
    }
    if (current.value !== null && typeof current.value === "object") {
      if (seen.has(current.value)) {
        throw new TraceValidationError(
          "trace artifact contains a cycle or repeated object reference",
        );
      }
      seen.add(current.value);
      for (const child of Array.isArray(current.value)
        ? current.value
        : Object.values(current.value)) {
        pending.push({ depth: current.depth + 1, value: child });
      }
    }
  }
}

function record(value: unknown, path: string, keys: readonly string[]): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TraceValidationError(`${path} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TraceValidationError(`${path} has missing or unknown fields`);
  }
  return value as UnknownRecord;
}

function array(value: unknown, path: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new TraceValidationError(`${path} must be an array with at most ${maximum} values`);
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new TraceValidationError(`${path} must be a string`);
  }
  return value;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TraceValidationError(`${path} must be a finite number`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function safeInteger(value: unknown, path: string): number {
  const parsed = finiteNumber(value, path);
  if (!Number.isSafeInteger(parsed)) {
    throw new TraceValidationError(`${path} must be a safe integer`);
  }
  return parsed;
}

function numberArray(value: unknown, path: string, maximum: number): readonly number[] {
  return Object.freeze(
    array(value, path, maximum).map((item, index) => finiteNumber(item, `${path}[${index}]`)),
  );
}

function stringArray(value: unknown, path: string, maximum: number): readonly string[] {
  return Object.freeze(
    array(value, path, maximum).map((item, index) => string(item, `${path}[${index}]`)),
  );
}

function traceMetadata(value: unknown, path: string): TraceMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TraceValidationError(`${path} must be an object`);
  }
  const entries = Object.entries(value);
  if (entries.length > 16 || entries.some(([key]) => key.length === 0 || key.length > 64)) {
    throw new TraceValidationError(`${path} has unsafe metadata keys`);
  }
  const parsed: Record<string, number | boolean | null> = Object.create(null);
  for (const [key, item] of entries) {
    if (item !== null && typeof item !== "boolean" && typeof item !== "number") {
      throw new TraceValidationError(`${path}.${key} has an unsupported value`);
    }
    parsed[key] = typeof item === "number" ? finiteNumber(item, `${path}.${key}`) : item;
  }
  return Object.freeze(parsed);
}

function numericStep(value: unknown, index: number): TraceStep {
  const path = `payload.trace.steps[${index}]`;
  const parsed = record(value, path, [
    "activeIndices",
    "algorithm",
    "metadata",
    "operation",
    "schemaVersion",
    "sequence",
    "snapshot",
  ]);
  const algorithm = string(parsed.algorithm, `${path}.algorithm`);
  if (algorithm !== "merge-sort" && algorithm !== "binary-search") {
    throw new TraceValidationError(`${path}.algorithm is unsupported`);
  }
  const operation = string(parsed.operation, `${path}.operation`);
  if (!["start", "compare", "write", "partition", "found", "complete"].includes(operation)) {
    throw new TraceValidationError(`${path}.operation is unsupported`);
  }
  if (safeInteger(parsed.schemaVersion, `${path}.schemaVersion`) !== TRACE_SCHEMA_VERSION) {
    throw new TraceValidationError(`${path}.schemaVersion is unsupported`);
  }
  return Object.freeze({
    schemaVersion: TRACE_SCHEMA_VERSION,
    algorithm,
    sequence: safeInteger(parsed.sequence, `${path}.sequence`),
    operation: operation as TraceStep["operation"],
    snapshot: numberArray(parsed.snapshot, `${path}.snapshot`, 512),
    activeIndices: numberArray(parsed.activeIndices, `${path}.activeIndices`, 512),
    metadata: traceMetadata(parsed.metadata, `${path}.metadata`),
  });
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function numericTrace(value: unknown): SortTrace | SearchTrace {
  const generic = record(value, "payload.trace", [
    "algorithm",
    ...(typeof (value as UnknownRecord)?.algorithm === "string" &&
    (value as UnknownRecord).algorithm === "merge-sort"
      ? ["input", "output", "steps"]
      : ["input", "resultIndex", "steps", "target"]),
  ]);
  const algorithm = string(generic.algorithm, "payload.trace.algorithm");
  const input = numberArray(generic.input, "payload.trace.input", 512);
  const steps = Object.freeze(
    array(generic.steps, "payload.trace.steps", MAX_TRACE_STEPS).map(numericStep),
  );
  const replay = replayTrace(steps);
  const first = steps[0];
  if (first === undefined || !sameNumbers(first.snapshot, input)) {
    throw new TraceValidationError("numeric trace input does not match its start step");
  }
  if (algorithm === "merge-sort") {
    const output = numberArray(generic.output, "payload.trace.output", 512);
    if (replay.algorithm !== algorithm || !sameNumbers(replay.finalSnapshot, output)) {
      throw new TraceValidationError("merge-sort output does not match its replay");
    }
    return Object.freeze({ algorithm, input, output, steps });
  }
  if (algorithm !== "binary-search") {
    throw new TraceValidationError("numeric trace algorithm is unsupported");
  }
  const target = finiteNumber(generic.target, "payload.trace.target");
  const resultIndex = safeInteger(generic.resultIndex, "payload.trace.resultIndex");
  if (
    replay.algorithm !== algorithm ||
    replay.resultIndex !== resultIndex ||
    first.metadata.target !== target
  ) {
    throw new TraceValidationError("binary-search result or target does not match its replay");
  }
  return Object.freeze({ algorithm, input, target, resultIndex, steps });
}

function graphStep(value: unknown, index: number): GraphTraceStep {
  const path = `payload.trace.steps[${index}]`;
  const parsed = record(value, path, [
    "algorithm",
    "frontier",
    "neighbor",
    "node",
    "operation",
    "schemaVersion",
    "sequence",
    "visited",
  ]);
  const algorithm = string(parsed.algorithm, `${path}.algorithm`);
  if (algorithm !== "breadth-first-search" && algorithm !== "depth-first-search") {
    throw new TraceValidationError(`${path}.algorithm is unsupported`);
  }
  const operation = string(parsed.operation, `${path}.operation`);
  if (!["start", "examine-edge", "discover", "visit", "complete"].includes(operation)) {
    throw new TraceValidationError(`${path}.operation is unsupported`);
  }
  if (safeInteger(parsed.schemaVersion, `${path}.schemaVersion`) !== GRAPH_TRACE_SCHEMA_VERSION) {
    throw new TraceValidationError(`${path}.schemaVersion is unsupported`);
  }
  const nullableString = (item: unknown, itemPath: string): string | null =>
    item === null ? null : string(item, itemPath);
  return Object.freeze({
    schemaVersion: GRAPH_TRACE_SCHEMA_VERSION,
    algorithm,
    sequence: safeInteger(parsed.sequence, `${path}.sequence`),
    operation: operation as GraphTraceStep["operation"],
    node: nullableString(parsed.node, `${path}.node`),
    neighbor: nullableString(parsed.neighbor, `${path}.neighbor`),
    visited: stringArray(parsed.visited, `${path}.visited`, 128),
    frontier: stringArray(parsed.frontier, `${path}.frontier`, 128),
  });
}

function graphTrace(value: unknown): GraphTrace {
  const parsed = record(value, "payload.trace", ["algorithm", "graph", "order", "start", "steps"]);
  const algorithm = string(parsed.algorithm, "payload.trace.algorithm");
  if (algorithm !== "breadth-first-search" && algorithm !== "depth-first-search") {
    throw new TraceValidationError("payload.trace.algorithm is unsupported");
  }
  const rawGraph = record(parsed.graph, "payload.trace.graph", ["directed", "edges", "nodes"]);
  if (typeof rawGraph.directed !== "boolean") {
    throw new TraceValidationError("payload.trace.graph.directed must be boolean");
  }
  const nodes = stringArray(rawGraph.nodes, "payload.trace.graph.nodes", 128);
  const edges = Object.freeze(
    array(rawGraph.edges, "payload.trace.graph.edges", 2_048).map((edge, index) => {
      const endpoints = array(edge, `payload.trace.graph.edges[${index}]`, 2);
      if (endpoints.length !== 2) {
        throw new TraceValidationError(`payload.trace.graph.edges[${index}] needs two endpoints`);
      }
      return Object.freeze([
        string(endpoints[0], `payload.trace.graph.edges[${index}][0]`),
        string(endpoints[1], `payload.trace.graph.edges[${index}][1]`),
      ]) as readonly [string, string];
    }),
  );
  const graphInput: GraphInput = { directed: rawGraph.directed, nodes, edges };
  const graph = normalizeGraph(graphInput);
  const start = string(parsed.start, "payload.trace.start");
  const order = stringArray(parsed.order, "payload.trace.order", 128);
  const steps = Object.freeze(
    array(parsed.steps, "payload.trace.steps", MAX_TRACE_STEPS).map(graphStep),
  );
  const trace = Object.freeze({ algorithm, graph, start, order, steps });
  replayGraphTrace(trace);
  return trace;
}

export async function importTraceArtifact(text: string): Promise<TraceArtifact> {
  if (typeof text !== "string") {
    throw new TraceValidationError("trace artifact must be text");
  }
  const bytes = encodedBytes(text).byteLength;
  if (bytes === 0 || bytes > MAX_TRACE_ARTIFACT_BYTES) {
    throw new TraceValidationError(
      `trace artifact must contain 1-${MAX_TRACE_ARTIFACT_BYTES} UTF-8 bytes`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as JsonValue;
  } catch {
    throw new TraceValidationError("trace artifact is not valid JSON");
  }
  assertStructureBounds(parsed);
  let canonical: string;
  try {
    canonical = canonicalJson(parsed);
  } catch {
    throw new TraceValidationError("trace artifact cannot be canonicalized");
  }
  if (canonical !== text) {
    throw new TraceValidationError("trace artifact JSON is not canonical");
  }
  const envelope = record(parsed, "artifact", ["format", "formatVersion", "payload", "sha256"]);
  if (envelope.format !== TRACE_ARTIFACT_FORMAT) {
    throw new TraceValidationError("trace artifact format is unsupported");
  }
  if (envelope.formatVersion !== TRACE_ARTIFACT_VERSION) {
    throw new TraceValidationError("trace artifact version is unsupported");
  }
  const digest = string(envelope.sha256, "artifact.sha256");
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new TraceValidationError("trace artifact SHA-256 is malformed");
  }
  const payloadText = canonicalJson(envelope.payload);
  if ((await sha256(payloadText)) !== digest) {
    throw new TraceValidationError("trace artifact SHA-256 does not match its payload");
  }
  const payload = record(envelope.payload, "payload", ["kind", "trace"]);
  const kind = string(payload.kind, "payload.kind");
  if (kind === "array") {
    return numericTrace(payload.trace);
  }
  if (kind === "graph") {
    return graphTrace(payload.trace);
  }
  throw new TraceValidationError("trace artifact kind is unsupported");
}
