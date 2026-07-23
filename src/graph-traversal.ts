import {
  GRAPH_TRACE_SCHEMA_VERSION,
  type GraphAlgorithm,
  type GraphInput,
  type GraphOperation,
  type GraphTrace,
  type GraphTraceOptions,
  type GraphTraceStep,
} from "./graph-types.js";
import { adjacencyFor, normalizeGraph, normalizeNodeLabel } from "./graph-validation.js";
import { TraceBudgetError, TraceValidationError, traceBudget } from "./validation.js";

class GraphStepBuilder {
  readonly #algorithm: GraphAlgorithm;
  readonly #budget: number;
  readonly #steps: GraphTraceStep[] = [];

  constructor(algorithm: GraphAlgorithm, options: GraphTraceOptions | undefined) {
    this.#algorithm = algorithm;
    this.#budget = traceBudget(options);
  }

  add(
    operation: GraphOperation,
    node: string | null,
    neighbor: string | null,
    visited: readonly string[],
    frontier: readonly string[],
  ): void {
    if (this.#steps.length >= this.#budget) {
      throw new TraceBudgetError(`graph trace exceeds ${this.#budget} steps`);
    }
    this.#steps.push(
      Object.freeze({
        schemaVersion: GRAPH_TRACE_SCHEMA_VERSION,
        algorithm: this.#algorithm,
        sequence: this.#steps.length,
        operation,
        node,
        neighbor,
        visited: Object.freeze([...visited]),
        frontier: Object.freeze([...frontier]),
      }),
    );
  }

  finish(): readonly GraphTraceStep[] {
    return Object.freeze([...this.#steps]);
  }
}

function traverse(
  algorithm: GraphAlgorithm,
  input: GraphInput,
  rawStart: string,
  options?: GraphTraceOptions,
): GraphTrace {
  const graph = normalizeGraph(input);
  const start = normalizeNodeLabel(rawStart);
  if (!graph.nodes.includes(start)) {
    throw new TraceValidationError("graph start node is not present");
  }
  const adjacency = adjacencyFor(graph);
  const builder = new GraphStepBuilder(algorithm, options);
  const visited: string[] = [];
  const discovered = new Set([start]);
  const frontier = [start];
  builder.add("start", start, null, visited, frontier);

  while (frontier.length > 0) {
    const node = algorithm === "breadth-first-search" ? frontier.shift() : frontier.pop();
    if (node === undefined) {
      throw new TraceValidationError("graph frontier became inconsistent");
    }
    visited.push(node);
    builder.add("visit", node, null, visited, frontier);
    const neighbors = adjacency.get(node);
    if (neighbors === undefined) {
      throw new TraceValidationError("graph adjacency is incomplete");
    }
    const traversalNeighbors =
      algorithm === "depth-first-search" ? [...neighbors].reverse() : [...neighbors];
    for (const neighbor of traversalNeighbors) {
      builder.add("examine-edge", node, neighbor, visited, frontier);
      if (!discovered.has(neighbor)) {
        discovered.add(neighbor);
        frontier.push(neighbor);
        builder.add("discover", node, neighbor, visited, frontier);
      }
    }
  }
  builder.add("complete", null, null, visited, frontier);
  const steps = builder.finish();
  return Object.freeze({
    algorithm,
    graph,
    start,
    order: Object.freeze([...visited]),
    steps,
  });
}

export function traceBreadthFirstSearch(
  graph: GraphInput,
  start: string,
  options?: GraphTraceOptions,
): GraphTrace {
  return traverse("breadth-first-search", graph, start, options);
}

export function traceDepthFirstSearch(
  graph: GraphInput,
  start: string,
  options?: GraphTraceOptions,
): GraphTrace {
  return traverse("depth-first-search", graph, start, options);
}
