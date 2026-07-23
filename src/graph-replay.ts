import {
  GRAPH_TRACE_SCHEMA_VERSION,
  type GraphAlgorithm,
  type GraphReplayResult,
  type GraphTrace,
  type GraphTraceStep,
} from "./graph-types.js";
import { adjacencyFor, normalizeGraph } from "./graph-validation.js";
import { TraceValidationError } from "./validation.js";

function equal(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertStep(
  actual: GraphTraceStep | undefined,
  expected: Omit<GraphTraceStep, "schemaVersion" | "algorithm" | "sequence">,
  algorithm: GraphAlgorithm,
  sequence: number,
): void {
  if (
    actual === undefined ||
    actual.schemaVersion !== GRAPH_TRACE_SCHEMA_VERSION ||
    actual.algorithm !== algorithm ||
    actual.sequence !== sequence ||
    actual.operation !== expected.operation ||
    actual.node !== expected.node ||
    actual.neighbor !== expected.neighbor ||
    !equal(actual.visited, expected.visited) ||
    !equal(actual.frontier, expected.frontier)
  ) {
    throw new TraceValidationError(`graph trace step ${sequence} is invalid`);
  }
  const uniqueVisited = new Set(actual.visited);
  if (uniqueVisited.size !== actual.visited.length) {
    throw new TraceValidationError("graph trace visits a node more than once");
  }
}

export function replayGraphTrace(trace: GraphTrace): GraphReplayResult {
  const graph = normalizeGraph(trace.graph);
  if (
    graph.directed !== trace.graph.directed ||
    !equal(graph.nodes, trace.graph.nodes) ||
    graph.edges.length !== trace.graph.edges.length ||
    graph.edges.some(
      (edge, index) =>
        edge[0] !== trace.graph.edges[index]?.[0] || edge[1] !== trace.graph.edges[index]?.[1],
    )
  ) {
    throw new TraceValidationError("graph trace input is not canonical");
  }
  if (!graph.nodes.includes(trace.start)) {
    throw new TraceValidationError("graph trace start node is not present");
  }
  if (trace.algorithm !== "breadth-first-search" && trace.algorithm !== "depth-first-search") {
    throw new TraceValidationError("graph trace algorithm is unsupported");
  }

  const adjacency = adjacencyFor(graph);
  const visited: string[] = [];
  const discovered = new Set([trace.start]);
  const frontier = [trace.start];
  let position = 0;
  assertStep(
    trace.steps[position],
    { operation: "start", node: trace.start, neighbor: null, visited, frontier },
    trace.algorithm,
    position,
  );
  position += 1;

  while (frontier.length > 0) {
    const node = trace.algorithm === "breadth-first-search" ? frontier.shift() : frontier.pop();
    if (node === undefined) {
      throw new TraceValidationError("graph replay frontier became inconsistent");
    }
    visited.push(node);
    assertStep(
      trace.steps[position],
      { operation: "visit", node, neighbor: null, visited, frontier },
      trace.algorithm,
      position,
    );
    position += 1;
    const neighbors = adjacency.get(node);
    if (neighbors === undefined) {
      throw new TraceValidationError("graph replay adjacency is incomplete");
    }
    const traversalNeighbors =
      trace.algorithm === "depth-first-search" ? [...neighbors].reverse() : [...neighbors];
    for (const neighbor of traversalNeighbors) {
      assertStep(
        trace.steps[position],
        { operation: "examine-edge", node, neighbor, visited, frontier },
        trace.algorithm,
        position,
      );
      position += 1;
      if (!discovered.has(neighbor)) {
        discovered.add(neighbor);
        frontier.push(neighbor);
        assertStep(
          trace.steps[position],
          { operation: "discover", node, neighbor, visited, frontier },
          trace.algorithm,
          position,
        );
        position += 1;
      }
    }
  }
  assertStep(
    trace.steps[position],
    { operation: "complete", node: null, neighbor: null, visited, frontier },
    trace.algorithm,
    position,
  );
  position += 1;
  if (position !== trace.steps.length || !equal(trace.order, visited)) {
    throw new TraceValidationError("graph trace has extra steps or a forged traversal order");
  }
  return Object.freeze({
    algorithm: trace.algorithm,
    order: Object.freeze([...visited]),
    reachableCount: visited.length,
  });
}
