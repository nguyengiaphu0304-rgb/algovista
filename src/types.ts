export const TRACE_SCHEMA_VERSION = 1 as const;
export const MAX_INPUT_LENGTH = 512;
export const MAX_TRACE_STEPS = 100_000;

export type AlgorithmId = "binary-search" | "merge-sort";
export type TraceOperation = "start" | "compare" | "write" | "partition" | "found" | "complete";
export type TraceMetadata = Readonly<Record<string, number | boolean | null>>;

export interface TraceStep {
  readonly schemaVersion: typeof TRACE_SCHEMA_VERSION;
  readonly algorithm: AlgorithmId;
  readonly sequence: number;
  readonly operation: TraceOperation;
  readonly snapshot: readonly number[];
  readonly activeIndices: readonly number[];
  readonly metadata: TraceMetadata;
}

export interface TraceOptions {
  readonly maxSteps?: number;
}

export interface SortTrace {
  readonly algorithm: "merge-sort";
  readonly input: readonly number[];
  readonly output: readonly number[];
  readonly steps: readonly TraceStep[];
}

export interface SearchTrace {
  readonly algorithm: "binary-search";
  readonly input: readonly number[];
  readonly target: number;
  readonly resultIndex: number;
  readonly steps: readonly TraceStep[];
}

export interface ReplayResult {
  readonly algorithm: AlgorithmId;
  readonly finalSnapshot: readonly number[];
  readonly resultIndex: number | null;
}
