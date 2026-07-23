import {
  type GraphAlgorithm,
  type GraphEdge,
  type GraphTraceStep,
  MAX_INPUT_LENGTH,
  replayGraphTrace,
  replayTrace,
  type TraceStep,
  TraceValidationError,
  traceBinarySearch,
  traceBreadthFirstSearch,
  traceDepthFirstSearch,
  traceMergeSort,
} from "../index.js";

export type WorkspaceAlgorithm = "binary-search" | "merge-sort" | GraphAlgorithm;

export interface ArrayWorkspaceRun {
  readonly kind: "array";
  readonly algorithm: "binary-search" | "merge-sort";
  readonly steps: readonly TraceStep[];
  readonly summary: string;
}

export interface GraphWorkspaceRun {
  readonly kind: "graph";
  readonly algorithm: GraphAlgorithm;
  readonly directed: boolean;
  readonly nodes: readonly string[];
  readonly edges: readonly GraphEdge[];
  readonly steps: readonly GraphTraceStep[];
  readonly summary: string;
}

export type WorkspaceRun = ArrayWorkspaceRun | GraphWorkspaceRun;

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
  algorithm: "binary-search" | "merge-sort",
  rawValues: string,
  rawTarget: string,
): ArrayWorkspaceRun {
  const values = parseNumberList(rawValues);
  if (algorithm === "merge-sort") {
    const execution = traceMergeSort(values);
    replayTrace(execution.steps);
    return Object.freeze({
      kind: "array",
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
    kind: "array",
    algorithm,
    steps: execution.steps,
    summary:
      execution.resultIndex === -1
        ? `Target ${target} was not found.`
        : `Target ${target} first appears at position ${execution.resultIndex + 1}.`,
  });
}

export function parseNodeLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (normalized === "") {
    return [];
  }
  return normalized.split("\n").map((line, index) => {
    if (line === "") {
      throw new TraceValidationError(`Node line ${index + 1} is empty.`);
    }
    return line;
  });
}

export function parseEdgeLines(raw: string): GraphEdge[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (normalized === "") {
    return [];
  }
  return normalized.split("\n").map((line, index) => {
    const endpoints = line.split("->");
    if (endpoints.length !== 2) {
      throw new TraceValidationError(`Edge line ${index + 1} must use exactly one "->" separator.`);
    }
    const from = endpoints[0]?.trim() ?? "";
    const to = endpoints[1]?.trim() ?? "";
    if (from === "" || to === "") {
      throw new TraceValidationError(`Edge line ${index + 1} needs two node labels.`);
    }
    return Object.freeze([from, to]);
  });
}

export function createGraphWorkspaceRun(
  algorithm: GraphAlgorithm,
  rawNodes: string,
  rawEdges: string,
  rawStart: string,
  directed: boolean,
): GraphWorkspaceRun {
  const graph = {
    directed,
    nodes: parseNodeLines(rawNodes),
    edges: parseEdgeLines(rawEdges),
  };
  const execution =
    algorithm === "breadth-first-search"
      ? traceBreadthFirstSearch(graph, rawStart)
      : traceDepthFirstSearch(graph, rawStart);
  const replay = replayGraphTrace(execution);
  return Object.freeze({
    kind: "graph",
    algorithm,
    directed: execution.graph.directed,
    nodes: execution.graph.nodes,
    edges: execution.graph.edges,
    steps: execution.steps,
    summary: `Visited ${replay.reachableCount} of ${execution.graph.nodes.length} nodes in order: ${replay.order.join(", ")}.`,
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

export function describeGraphStep(step: GraphTraceStep): string {
  const position = `Step ${step.sequence + 1}`;
  const frontier =
    step.frontier.length === 0 ? "Frontier is empty." : `Frontier: ${step.frontier.join(", ")}.`;
  const visited =
    step.visited.length === 0 ? "No nodes visited." : `Visited: ${step.visited.join(", ")}.`;
  switch (step.operation) {
    case "start":
      return `${position}: started ${step.algorithm} at ${step.node}. ${frontier} ${visited}`;
    case "visit":
      return `${position}: visited ${step.node}. ${frontier} ${visited}`;
    case "examine-edge":
      return `${position}: examined edge ${step.node} to ${step.neighbor}. ${frontier} ${visited}`;
    case "discover":
      return `${position}: discovered ${step.neighbor} from ${step.node}. ${frontier} ${visited}`;
    case "complete":
      return `${position}: completed ${step.algorithm}. ${frontier} ${visited}`;
  }
}

export function clampedStepIndex(current: number, delta: number, stepCount: number): number {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(delta) || stepCount < 1) {
    return 0;
  }
  return Math.min(stepCount - 1, Math.max(0, current + delta));
}
