import {
  MAX_INPUT_LENGTH,
  replayTrace,
  type TraceStep,
  TraceValidationError,
  traceBinarySearch,
  traceMergeSort,
} from "../index.js";

export type WorkspaceAlgorithm = "binary-search" | "merge-sort";

export interface WorkspaceRun {
  readonly algorithm: WorkspaceAlgorithm;
  readonly steps: readonly TraceStep[];
  readonly summary: string;
}

export function parseNumberList(raw: string): number[] {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }
  const tokens = trimmed.split(",");
  if (tokens.length > MAX_INPUT_LENGTH) {
    throw new TraceValidationError(`Enter at most ${MAX_INPUT_LENGTH} comma-separated values.`);
  }
  return tokens.map((token, index) => {
    const value = token.trim();
    if (value === "") {
      throw new TraceValidationError(`Value ${index + 1} is empty.`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new TraceValidationError(`Value ${index + 1} must be a finite number.`);
    }
    return Object.is(parsed, -0) ? 0 : parsed;
  });
}

export function createWorkspaceRun(
  algorithm: WorkspaceAlgorithm,
  rawValues: string,
  rawTarget: string,
): WorkspaceRun {
  const values = parseNumberList(rawValues);
  if (algorithm === "merge-sort") {
    const execution = traceMergeSort(values);
    replayTrace(execution.steps);
    return Object.freeze({
      algorithm,
      steps: execution.steps,
      summary: `Sorted ${values.length} values into ${execution.output.join(", ")}.`,
    });
  }

  const targetText = rawTarget.trim();
  if (targetText === "") {
    throw new TraceValidationError("Enter a binary-search target.");
  }
  const target = Number(targetText);
  if (!Number.isFinite(target)) {
    throw new TraceValidationError("The binary-search target must be a finite number.");
  }
  const execution = traceBinarySearch(values, Object.is(target, -0) ? 0 : target);
  replayTrace(execution.steps);
  return Object.freeze({
    algorithm,
    steps: execution.steps,
    summary:
      execution.resultIndex === -1
        ? `Target ${target} was not found.`
        : `Target ${target} first appears at position ${execution.resultIndex + 1}.`,
  });
}

export function describeStep(step: TraceStep): string {
  const position = `Step ${step.sequence + 1}`;
  const active =
    step.activeIndices.length === 0
      ? ""
      : ` Active position${step.activeIndices.length === 1 ? "" : "s"}: ${step.activeIndices
          .map((index) => index + 1)
          .join(", ")}.`;
  switch (step.operation) {
    case "start":
      return `${position}: started ${step.algorithm}.${active}`;
    case "partition":
      return `${position}: selected a merge partition.${active}`;
    case "compare":
      return `${position}: compared values.${active}`;
    case "write":
      return `${position}: wrote ${String(step.metadata.writtenValue)}.${active}`;
    case "found":
      return `${position}: found a matching value.${active}`;
    case "complete":
      return `${position}: completed ${step.algorithm}.${active}`;
  }
}

export function clampedStepIndex(current: number, delta: number, stepCount: number): number {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(delta) || stepCount < 1) {
    return 0;
  }
  return Math.min(stepCount - 1, Math.max(0, current + delta));
}
