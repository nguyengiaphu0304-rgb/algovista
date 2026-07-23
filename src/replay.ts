import {
  type AlgorithmId,
  MAX_INPUT_LENGTH,
  type ReplayResult,
  TRACE_SCHEMA_VERSION,
  type TraceStep,
} from "./types.js";
import { TraceValidationError, validateSorted } from "./validation.js";

function equal(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function multiset(values: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function sameMultiset(left: readonly number[], right: readonly number[]): boolean {
  const leftCounts = multiset(left);
  const rightCounts = multiset(right);
  return (
    leftCounts.size === rightCounts.size &&
    [...leftCounts].every(([value, count]) => rightCounts.get(value) === count)
  );
}

function metadataNumber(step: TraceStep, key: string): number {
  const value = step.metadata[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TraceValidationError(`trace metadata ${key} must be finite`);
  }
  return value;
}

export function replayTrace(steps: readonly TraceStep[]): ReplayResult {
  if (steps.length < 2) {
    throw new TraceValidationError("trace requires start and complete steps");
  }
  const first = steps[0];
  const last = steps.at(-1);
  if (first === undefined || last === undefined || first.operation !== "start") {
    throw new TraceValidationError("trace must begin with start");
  }
  if (last.operation !== "complete") {
    throw new TraceValidationError("trace must end with complete");
  }
  if (first.snapshot.length > MAX_INPUT_LENGTH) {
    throw new TraceValidationError("trace input exceeds the supported limit");
  }
  const algorithm: AlgorithmId = first.algorithm;
  const initial = [...first.snapshot];
  let prior = [...initial];

  for (const [position, step] of steps.entries()) {
    if (
      step.schemaVersion !== TRACE_SCHEMA_VERSION ||
      step.algorithm !== algorithm ||
      step.sequence !== position ||
      step.snapshot.length !== initial.length ||
      step.snapshot.some((value) => !Number.isFinite(value))
    ) {
      throw new TraceValidationError("trace schema, sequence, algorithm, or snapshot is invalid");
    }
    if (
      step.activeIndices.some(
        (index) => !Number.isSafeInteger(index) || index < 0 || index >= initial.length,
      )
    ) {
      throw new TraceValidationError("trace active index is invalid");
    }
    if (position === 0) {
      continue;
    }
    if (step.operation === "write") {
      if (step.activeIndices.length !== 1) {
        throw new TraceValidationError("write must identify exactly one index");
      }
      const active = step.activeIndices[0];
      if (active === undefined) {
        throw new TraceValidationError("write index is missing");
      }
      const changed = step.snapshot
        .map((value, index) => (value === prior[index] ? -1 : index))
        .filter((index) => index >= 0);
      if (
        changed.some((index) => index !== active) ||
        metadataNumber(step, "writtenValue") !== step.snapshot[active]
      ) {
        throw new TraceValidationError("write transition does not match its metadata");
      }
    } else if (!equal(step.snapshot, prior)) {
      throw new TraceValidationError(`${step.operation} cannot mutate the snapshot`);
    }
    prior = [...step.snapshot];
  }

  let resultIndex: number | null = null;
  if (algorithm === "merge-sort") {
    validateSorted(last.snapshot);
    if (!sameMultiset(initial, last.snapshot)) {
      throw new TraceValidationError("merge-sort output changes the input multiset");
    }
  } else {
    validateSorted(initial);
    const target = metadataNumber(first, "target");
    resultIndex = metadataNumber(last, "resultIndex");
    if (!Number.isSafeInteger(resultIndex) || resultIndex < -1 || resultIndex >= initial.length) {
      throw new TraceValidationError("binary-search result index is invalid");
    }
    const expected = initial.indexOf(target);
    if (resultIndex !== expected) {
      throw new TraceValidationError("binary-search result is not the first matching index");
    }
  }
  return Object.freeze({
    algorithm,
    finalSnapshot: Object.freeze([...last.snapshot]),
    resultIndex,
  });
}
