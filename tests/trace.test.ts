import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_INPUT_LENGTH,
  replayTrace,
  TraceBudgetError,
  type TraceStep,
  TraceValidationError,
  traceBinarySearch,
  traceMergeSort,
} from "../src/index.js";
import {
  clampedStepIndex,
  createWorkspaceRun,
  describeStep,
  parseNumberList,
} from "../src/web/controller.js";

test("merge sort is deterministic, immutable, sorted, and replayable", () => {
  const input = [5, -1, 5, 0, -0, 2];
  const original = [...input];
  const first = traceMergeSort(input);
  const second = traceMergeSort(input);
  assert.deepEqual(input, original);
  assert.deepEqual(first.output, [-1, 0, 0, 2, 5, 5]);
  assert.deepEqual(first, second);
  assert(Object.isFrozen(first.input));
  assert(Object.isFrozen(first.output));
  assert(Object.isFrozen(first.steps));
  assert(first.steps.every((step) => Object.isFrozen(step) && Object.isFrozen(step.snapshot)));
  assert.equal(Reflect.set(first.steps[0]?.snapshot ?? [], "0", 999), false);
  assert.deepEqual(replayTrace(first.steps).finalSnapshot, first.output);
});

test("merge sort handles empty, singleton, sorted, reverse, and duplicate arrays", () => {
  for (const [input, expected] of [
    [[], []],
    [[7], [7]],
    [
      [1, 2, 3],
      [1, 2, 3],
    ],
    [
      [3, 2, 1],
      [1, 2, 3],
    ],
    [
      [2, 1, 2, 1],
      [1, 1, 2, 2],
    ],
  ] satisfies ReadonlyArray<readonly [readonly number[], readonly number[]]>) {
    const result = traceMergeSort(input);
    assert.deepEqual(result.output, expected);
    assert.deepEqual(replayTrace(result.steps).finalSnapshot, expected);
  }
});

test("binary search returns the first duplicate and records misses", () => {
  const found = traceBinarySearch([-2, 1, 1, 1, 9], 1);
  assert.equal(found.resultIndex, 1);
  assert.equal(replayTrace(found.steps).resultIndex, 1);
  assert.deepEqual(found.input, [-2, 1, 1, 1, 9]);

  const missing = traceBinarySearch([], 4);
  assert.equal(missing.resultIndex, -1);
  assert.equal(replayTrace(missing.steps).resultIndex, -1);
});

test("validation rejects unsafe inputs and budgets", () => {
  assert.throws(() => traceMergeSort([Number.NaN]), TraceValidationError);
  assert.throws(() => traceMergeSort([Number.POSITIVE_INFINITY]), TraceValidationError);
  assert.throws(() => traceBinarySearch([2, 1], 1), /sorted ascending/);
  assert.throws(() => traceBinarySearch([1], Number.NaN), /target must be finite/);
  assert.throws(
    () => traceMergeSort(Array.from({ length: MAX_INPUT_LENGTH + 1 }, (_, index) => index)),
    /input exceeds/,
  );
  assert.throws(() => traceMergeSort([3, 2, 1], { maxSteps: 2 }), TraceBudgetError);
  assert.throws(() => traceMergeSort([1], { maxSteps: 1 }), /maxSteps/);
});

test("replay rejects sequence, transition, schema, and final-result tampering", () => {
  const sorted = traceMergeSort([3, 1, 2]);
  const reordered = sorted.steps.map((step, index) =>
    index === 1 ? { ...step, sequence: 99 } : step,
  );
  assert.throws(() => replayTrace(reordered), /schema, sequence/);

  const changedComparison = sorted.steps.map((step) =>
    step.operation === "compare"
      ? { ...step, snapshot: Object.freeze(step.snapshot.map((value) => value + 1)) }
      : step,
  );
  assert.throws(() => replayTrace(changedComparison), /cannot mutate/);

  const forgedSchema = sorted.steps.map((step, index) =>
    index === 0 ? ({ ...step, schemaVersion: 2 } as unknown as TraceStep) : step,
  );
  assert.throws(() => replayTrace(forgedSchema), /schema, sequence/);

  const search = traceBinarySearch([1, 2, 2], 2);
  const forgedResult = search.steps.map((step) =>
    step.operation === "complete"
      ? { ...step, metadata: { ...step.metadata, resultIndex: 2 } }
      : step,
  );
  assert.throws(() => replayTrace(forgedResult), /first matching index/);
});

test("seeded property cases match the platform numeric baseline", () => {
  let state = 0x1234_5678;
  const random = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
  for (let sample = 0; sample < 100; sample += 1) {
    const length = random() % 40;
    const input = Array.from({ length }, () => (random() % 31) - 15);
    const expected = [...input].sort((left, right) => left - right);
    const result = traceMergeSort(input);
    assert.deepEqual(result.output, expected);
    assert.deepEqual(replayTrace(result.steps).finalSnapshot, expected);
    const target = (random() % 31) - 15;
    const search = traceBinarySearch(expected, target);
    assert.equal(search.resultIndex, expected.indexOf(target));
    assert.equal(replayTrace(search.steps).resultIndex, expected.indexOf(target));
  }
});

test("workspace controller parses, validates, and describes verified traces", () => {
  assert.deepEqual(parseNumberList(" 3, -0, 1.5 "), [3, 0, 1.5]);
  assert.deepEqual(parseNumberList(""), []);
  assert.throws(() => parseNumberList("1,,2"), /empty/);
  assert.throws(() => parseNumberList("1, nope"), /finite number/);
  const sorted = createWorkspaceRun("merge-sort", "3, 1, 2", "");
  assert.match(sorted.summary, /1, 2, 3/);
  const firstStep = sorted.steps[0];
  assert(firstStep);
  assert.match(describeStep(firstStep), /Step 1/);
  const found = createWorkspaceRun("binary-search", "1, 2, 2", "2");
  assert.match(found.summary, /position 2/);
  assert.throws(() => createWorkspaceRun("binary-search", "2, 1", "1"), /sorted ascending/);
  assert.throws(() => createWorkspaceRun("binary-search", "1, 2", ""), /target/);
  assert.equal(clampedStepIndex(0, -1, 4), 0);
  assert.equal(clampedStepIndex(2, 9, 4), 3);
});
