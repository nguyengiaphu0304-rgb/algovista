import {
  type GraphEdge,
  type GraphInput,
  MAX_GRAPH_EDGES,
  MAX_GRAPH_NODES,
  MAX_NODE_LABEL_LENGTH,
  type NormalizedGraph,
} from "./graph-types.js";
import { TraceValidationError } from "./validation.js";

export function compareLabels(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeNodeLabel(label: string): string {
  if (typeof label !== "string") {
    throw new TraceValidationError("graph node labels must be strings");
  }
  if (label.trim() !== label || label.length === 0) {
    throw new TraceValidationError(
      "graph node labels must be non-empty without surrounding whitespace",
    );
  }
  const normalized = label.normalize("NFC");
  if (normalized.includes("\u0000")) {
    throw new TraceValidationError("graph node labels cannot contain null characters");
  }
  if ([...normalized].length > MAX_NODE_LABEL_LENGTH) {
    throw new TraceValidationError(
      `graph node labels cannot exceed ${MAX_NODE_LABEL_LENGTH} Unicode code points`,
    );
  }
  return normalized;
}

function edgeKey(from: string, to: string, directed: boolean): string {
  if (directed || compareLabels(from, to) <= 0) {
    return `${from}\u0000${to}`;
  }
  return `${to}\u0000${from}`;
}

export function normalizeGraph(input: GraphInput): NormalizedGraph {
  if (typeof input.directed !== "boolean") {
    throw new TraceValidationError("graph directed must be boolean");
  }
  if (input.nodes.length === 0) {
    throw new TraceValidationError("graph requires at least one node");
  }
  if (input.nodes.length > MAX_GRAPH_NODES) {
    throw new TraceValidationError(`graph exceeds ${MAX_GRAPH_NODES} nodes`);
  }
  if (input.edges.length > MAX_GRAPH_EDGES) {
    throw new TraceValidationError(`graph exceeds ${MAX_GRAPH_EDGES} edges`);
  }

  const nodes = input.nodes.map(normalizeNodeLabel);
  if (new Set(nodes).size !== nodes.length) {
    throw new TraceValidationError("graph contains duplicate or normalization-colliding nodes");
  }
  nodes.sort(compareLabels);
  const nodeSet = new Set(nodes);
  const edgeKeys = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const edge of input.edges) {
    if (!Array.isArray(edge) || edge.length !== 2) {
      throw new TraceValidationError("graph edges must contain exactly two endpoints");
    }
    const from = normalizeNodeLabel(edge[0]);
    const to = normalizeNodeLabel(edge[1]);
    if (!nodeSet.has(from) || !nodeSet.has(to)) {
      throw new TraceValidationError("graph edge references an unknown node");
    }
    const key = edgeKey(from, to, input.directed);
    if (edgeKeys.has(key)) {
      throw new TraceValidationError("graph contains a duplicate edge");
    }
    edgeKeys.add(key);
    const canonical: GraphEdge =
      input.directed || compareLabels(from, to) <= 0
        ? Object.freeze([from, to])
        : Object.freeze([to, from]);
    edges.push(canonical);
  }
  edges.sort(([leftFrom, leftTo], [rightFrom, rightTo]) => {
    const fromOrder = compareLabels(leftFrom, rightFrom);
    return fromOrder === 0 ? compareLabels(leftTo, rightTo) : fromOrder;
  });
  return Object.freeze({
    directed: input.directed,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}

export function adjacencyFor(graph: NormalizedGraph): ReadonlyMap<string, readonly string[]> {
  const mutable = new Map(graph.nodes.map((node) => [node, [] as string[]]));
  for (const [from, to] of graph.edges) {
    mutable.get(from)?.push(to);
    if (!graph.directed && from !== to) {
      mutable.get(to)?.push(from);
    }
  }
  return new Map(
    [...mutable].map(([node, neighbors]) => [
      node,
      Object.freeze(neighbors.sort(compareLabels)) as readonly string[],
    ]),
  );
}
