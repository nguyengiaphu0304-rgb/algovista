import type { TraceOptions } from "./types.js";

export const GRAPH_TRACE_SCHEMA_VERSION = 1 as const;
export const MAX_GRAPH_NODES = 128;
export const MAX_GRAPH_EDGES = 2_048;
export const MAX_NODE_LABEL_LENGTH = 64;

export type GraphAlgorithm = "breadth-first-search" | "depth-first-search";
export type GraphOperation = "start" | "examine-edge" | "discover" | "visit" | "complete";
export type GraphEdge = readonly [from: string, to: string];

export interface GraphInput {
  readonly directed: boolean;
  readonly nodes: readonly string[];
  readonly edges: readonly GraphEdge[];
}

export interface NormalizedGraph {
  readonly directed: boolean;
  readonly nodes: readonly string[];
  readonly edges: readonly GraphEdge[];
}

export interface GraphTraceStep {
  readonly schemaVersion: typeof GRAPH_TRACE_SCHEMA_VERSION;
  readonly algorithm: GraphAlgorithm;
  readonly sequence: number;
  readonly operation: GraphOperation;
  readonly node: string | null;
  readonly neighbor: string | null;
  readonly visited: readonly string[];
  readonly frontier: readonly string[];
}

export interface GraphTrace {
  readonly algorithm: GraphAlgorithm;
  readonly graph: NormalizedGraph;
  readonly start: string;
  readonly order: readonly string[];
  readonly steps: readonly GraphTraceStep[];
}

export interface GraphTraceOptions extends TraceOptions {}

export interface GraphReplayResult {
  readonly algorithm: GraphAlgorithm;
  readonly order: readonly string[];
  readonly reachableCount: number;
}
