import assert from "node:assert/strict";
import test from "node:test";

import {
  type GraphInput,
  type GraphTrace,
  MAX_GRAPH_NODES,
  replayGraphTrace,
  TraceBudgetError,
  traceBreadthFirstSearch,
  traceDepthFirstSearch,
} from "../src/index.js";

const fixture: GraphInput = {
  directed: false,
  nodes: ["D", "B", "A", "C", "isolated"],
  edges: [
    ["A", "C"],
    ["A", "B"],
    ["B", "D"],
    ["C", "D"],
  ],
};

test("BFS and DFS are deterministic, immutable, and independently replayable", () => {
  const breadth = traceBreadthFirstSearch(fixture, "A");
  const depth = traceDepthFirstSearch(fixture, "A");
  assert.deepEqual(breadth.order, ["A", "B", "C", "D"]);
  assert.deepEqual(depth.order, ["A", "B", "D", "C"]);
  assert.deepEqual(replayGraphTrace(breadth).order, breadth.order);
  assert.deepEqual(replayGraphTrace(depth).order, depth.order);
  assert(Object.isFrozen(breadth.graph));
  assert(Object.isFrozen(breadth.graph.nodes));
  assert(Object.isFrozen(breadth.graph.edges[0]));
  assert(Object.isFrozen(breadth.steps));
  assert(breadth.steps.every((step) => Object.isFrozen(step) && Object.isFrozen(step.frontier)));
  assert.equal(Reflect.set(breadth.order, "0", "forged"), false);
});

test("directed edges, self-loops, cycles, and isolated starts have explicit behavior", () => {
  const graph: GraphInput = {
    directed: true,
    nodes: ["A", "B", "C", "D"],
    edges: [
      ["A", "A"],
      ["A", "B"],
      ["B", "C"],
      ["C", "A"],
    ],
  };
  assert.deepEqual(traceBreadthFirstSearch(graph, "A").order, ["A", "B", "C"]);
  assert.deepEqual(traceBreadthFirstSearch(graph, "D").order, ["D"]);
  assert.deepEqual(traceBreadthFirstSearch(graph, "C").order, ["C", "A", "B"]);
});

test("validation rejects malformed graphs before traversal", () => {
  assert.throws(
    () => traceBreadthFirstSearch({ directed: false, nodes: [], edges: [] }, "A"),
    /at least one/,
  );
  assert.throws(
    () => traceBreadthFirstSearch({ directed: false, nodes: ["A", "A"], edges: [] }, "A"),
    /duplicate/,
  );
  assert.throws(
    () => traceBreadthFirstSearch({ directed: false, nodes: ["é", "e\u0301"], edges: [] }, "é"),
    /normalization-colliding/,
  );
  assert.throws(
    () =>
      traceBreadthFirstSearch(
        {
          directed: false,
          nodes: ["A", "B"],
          edges: [
            ["A", "B"],
            ["B", "A"],
          ],
        },
        "A",
      ),
    /duplicate edge/,
  );
  assert.throws(
    () => traceBreadthFirstSearch({ directed: true, nodes: ["A"], edges: [["A", "missing"]] }, "A"),
    /unknown node/,
  );
  assert.throws(
    () => traceBreadthFirstSearch({ directed: true, nodes: [" A"], edges: [] }, " A"),
    /whitespace/,
  );
  assert.throws(
    () =>
      traceBreadthFirstSearch(
        {
          directed: false,
          nodes: Array.from({ length: MAX_GRAPH_NODES + 1 }, (_, index) => `N${index}`),
          edges: [],
        },
        "N0",
      ),
    /exceeds/,
  );
  assert.throws(() => traceBreadthFirstSearch(fixture, "missing"), /not present/);
  assert.throws(() => traceBreadthFirstSearch(fixture, "A", { maxSteps: 2 }), TraceBudgetError);
});

test("replay rejects altered sequence, frontier, result, schema, and extra steps", () => {
  const trace = traceBreadthFirstSearch(fixture, "A");
  const copy = (steps: GraphTrace["steps"]): GraphTrace => ({ ...trace, steps });
  const sequence = trace.steps.map((step, index) =>
    index === 1 ? { ...step, sequence: 99 } : step,
  );
  assert.throws(() => replayGraphTrace(copy(sequence)), /step 1/);
  const frontier = trace.steps.map((step, index) =>
    index === 2 ? { ...step, frontier: ["forged"] } : step,
  );
  assert.throws(() => replayGraphTrace(copy(frontier)), /step 2/);
  assert.throws(() => replayGraphTrace({ ...trace, order: ["A"] }), /forged traversal order/);
  const schema = trace.steps.map((step, index) =>
    index === 0 ? { ...step, schemaVersion: 2 as never } : step,
  );
  assert.throws(() => replayGraphTrace(copy(schema)), /step 0/);
  const finalStep = trace.steps.at(-1);
  assert(finalStep);
  assert.throws(() => replayGraphTrace(copy([...trace.steps, finalStep])), /extra steps/);
});

test("seeded graph fixtures match independent queue and stack baselines", () => {
  let state = 0x9e37_79b9;
  const random = (): number => {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
    return state;
  };
  for (let sample = 0; sample < 50; sample += 1) {
    const count = 2 + (random() % 12);
    const nodes = Array.from({ length: count }, (_, index) => `N${String(index).padStart(2, "0")}`);
    const edges: Array<readonly [string, string]> = [];
    for (let from = 0; from < count; from += 1) {
      for (let to = from + 1; to < count; to += 1) {
        if (random() % 5 === 0) {
          const fromNode = nodes[from];
          const toNode = nodes[to];
          assert(fromNode);
          assert(toNode);
          edges.push([fromNode, toNode]);
        }
      }
    }
    const graph: GraphInput = { directed: false, nodes, edges };
    const start = nodes[0];
    assert(start);
    for (const trace of [
      traceBreadthFirstSearch(graph, start),
      traceDepthFirstSearch(graph, start),
    ]) {
      const replay = replayGraphTrace(trace);
      assert.deepEqual(replay.order, trace.order);
      assert.equal(new Set(trace.order).size, trace.order.length);
      assert(trace.order.every((node) => nodes.includes(node)));
    }
  }
});
