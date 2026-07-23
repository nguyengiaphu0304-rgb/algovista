# AlgoVista

AlgoVista is a correctness-first foundation for teaching and visualizing algorithms. Instead of
coupling algorithm code directly to animation, it produces typed semantic execution traces that can
be replayed and validated before a user interface renders them.

The current milestone includes stable merge sort, first-match binary search, and deterministic BFS/DFS
over validated graphs. It is an educational tool, not a benchmark suite or proof that one algorithm
is universally best.

## Why semantic traces?

Animation state is easy to forge accidentally: a UI can skip a write, reorder a comparison or display
a final answer that the algorithm never produced. AlgoVista separates concerns:

1. An algorithm validates and copies caller input.
2. It emits immutable steps with version, sequence, operation, snapshot and active indices.
3. An independent replay verifier checks every transition and the final algorithm-specific invariant.
4. Future interfaces can turn the same steps into motion, text or screen-reader announcements.

## Features

- Zero production dependencies and strict TypeScript.
- Deterministic bottom-up merge sort with explicit partitions, comparisons and writes.
- Binary search that returns the first matching duplicate.
- Deterministic BFS and iterative DFS over canonical directed or undirected graphs.
- Graph validation for Unicode labels, duplicate edges, unknown endpoints and resource limits.
- Independent graph replay that rejects forged visited/frontier state.
- Canonical trace artifact import/export with strict schemas, a 1 MiB limit and SHA-256 integrity.
- Frozen inputs, outputs, steps, snapshots, indices and metadata.
- Bounded inputs and traces with fail-closed validation.
- Replay checks for schema, order, mutations, sort multiset and search result integrity.
- Seeded property-style coverage without live services or nondeterministic fixtures.
- Responsive semantic playback workspace with visible and screen-reader status.
- BFS/DFS graph playback with semantic node, edge, visited and frontier lists.
- Keyboard navigation, reduced-motion behavior and explicit accessibility budgets.

## Setup and verification

```bash
npm ci
npm run check
npm run typecheck
npm test
npm run build
npm run verify:budgets
npx playwright install chromium
npm run test:browser
npm pack --dry-run
npm audit --audit-level=high
```

## Example

```ts
import { replayTrace, traceMergeSort } from "algovista";

const execution = traceMergeSort([3, 1, 2]);
console.log(execution.output); // [1, 2, 3]
console.log(replayTrace(execution.steps).finalSnapshot); // [1, 2, 3]
```

```ts
import { replayGraphTrace, traceBreadthFirstSearch } from "algovista";

const trace = traceBreadthFirstSearch(
  { directed: false, nodes: ["A", "B", "C"], edges: [["A", "B"], ["A", "C"]] },
  "A",
);
console.log(trace.order); // ["A", "B", "C"]
console.log(replayGraphTrace(trace).reachableCount); // 3
```

```ts
import { exportTraceArtifact, importTraceArtifact, traceMergeSort } from "algovista";

const text = await exportTraceArtifact(traceMergeSort([3, 1, 2]));
const verified = await importTraceArtifact(text);
console.log(verified.algorithm); // "merge-sort"
```

The importer accepts only canonical UTF-8 JSON produced by the exporter. It verifies the envelope,
payload digest, exact field sets and every algorithm transition before returning a deeply frozen
trace. SHA-256 detects accidental or unauthenticated payload changes; it does not establish who
created an artifact. See the [artifact format](docs/artifact-format.md) for the security boundary.

## Complexity and evidence

Merge sort uses `O(n log n)` comparisons and `O(n)` working memory. Trace storage is intentionally
larger because every semantic step has a full immutable snapshot. Inputs are therefore limited to
512 values and traces to 100,000 steps. Binary search uses `O(log n)` comparisons over a validated
sorted input.

BFS and DFS use `O(V + E)` time with bounded graph and trace sizes. Traversal covers only the component
reachable from the selected start node. Timings are not presented as cross-device benchmarks.

Tests verify edge cases and 100 deterministically generated arrays. These are correctness checks, not
claims about performance across devices.

## Documentation

- [Architecture](docs/architecture.md)
- [Trace contract](docs/trace-contract.md)
- [Artifact format](docs/artifact-format.md)
- [Threat model](docs/threat-model.md)
- [Accessibility contract](docs/accessibility.md)
- [Roadmap](docs/roadmap.md)
- [Interview guide](docs/interview-guide.md)
- [ADR-001](docs/adr/001-semantic-traces-before-ui.md)
- [ADR-002](docs/adr/002-progressive-semantic-workspace.md)
- [ADR-003](docs/adr/003-separate-graph-trace-contract.md)
- [ADR-004](docs/adr/004-canonical-trace-artifacts.md)
- [ADR-005](docs/adr/005-semantic-graph-workspace.md)

## Limitations

The browser presents merge sort, binary search, BFS and DFS, while artifact import/export remains
library-only. Graph entry uses a deliberately small line-oriented UI contract, not an arbitrary graph
file parser. Artifacts are not signed or authenticated, and full snapshots remain larger than compact
deltas. The project does not execute untrusted user code. Automated browser and axe-core checks are
regression evidence, not proof of usability with every assistive technology. Manual NVDA/Firefox and
VoiceOver/Safari sessions remain required before the v1.0 accessibility gate can be claimed.
