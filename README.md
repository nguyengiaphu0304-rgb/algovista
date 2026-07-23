# AlgoVista

AlgoVista is a correctness-first foundation for teaching and visualizing algorithms. Instead of
coupling algorithm code directly to animation, it produces typed semantic execution traces that can
be replayed and validated before a user interface renders them.

The v1.0 release candidate includes stable merge sort, first-match binary search, deterministic
BFS/DFS over validated graphs, an accessible playback workspace and reproducible release evidence.
It is an educational tool, not a benchmark suite or proof that one algorithm is universally best.

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
- Four synthetic, canonical demo artifacts with source, generator and SHA-256 lineage.
- Byte-for-byte reproducible npm package verification and isolated-install smoke testing.

## Setup and verification

```bash
npm ci
npm run check
npm run typecheck
npm test
npm run build
npm run verify:budgets
npm run demo:verify
npm run release:verify
npx playwright install chromium
npm run test:browser
npm audit --audit-level=high
```

`npm run release:verify` creates `release/algovista-1.0.0.tgz`, `SHA256SUMS` and a machine-readable
manifest only after two independently packed archives match byte-for-byte, every tar member matches
the exact local allowlist and an isolated install imports and runs the public API.

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

The checked-in [demo evidence](demo/evidence/manifest.json) is generated entirely from synthetic
inputs through the production public API. Run `npm run demo:verify` to regenerate it in a temporary
directory, compare every byte, verify lineage and independently replay every artifact. See the
[demo guide](docs/demo.md) for the evidence boundary.

## Documentation

- [Architecture](docs/architecture.md)
- [Trace contract](docs/trace-contract.md)
- [Artifact format](docs/artifact-format.md)
- [Threat model](docs/threat-model.md)
- [Accessibility contract](docs/accessibility.md)
- [Reproducible demo](docs/demo.md)
- [Roadmap](docs/roadmap.md)
- [Interview guide](docs/interview-guide.md)
- [v1.0.0 release notes](docs/releases/v1.0.0.md)
- [Publication checklist](docs/releases/publication-checklist.md)
- [Residual risks](docs/releases/residual-risks.md)
- [ADR-001](docs/adr/001-semantic-traces-before-ui.md)
- [ADR-002](docs/adr/002-progressive-semantic-workspace.md)
- [ADR-003](docs/adr/003-separate-graph-trace-contract.md)
- [ADR-004](docs/adr/004-canonical-trace-artifacts.md)
- [ADR-005](docs/adr/005-semantic-graph-workspace.md)
- [ADR-006](docs/adr/006-reproducible-release-evidence.md)

## Limitations

The browser presents merge sort, binary search, BFS and DFS, while artifact import/export remains
library-only. Graph entry uses a deliberately small line-oriented UI contract, not an arbitrary graph
file parser. Artifacts are not signed or authenticated, and full snapshots remain larger than compact
deltas. The project does not execute untrusted user code. Automated browser and axe-core checks are
regression evidence, not proof of usability with every assistive technology. Manual NVDA/Firefox and
VoiceOver/Safari sessions remain required before the v1.0 accessibility gate can be claimed.
The package checksum detects accidental or unauthenticated changes; artifacts and packages are not
signed, and no publisher identity should be inferred from SHA-256 alone. The candidate is not a
published GitHub Release until all pending manual gates and publication steps are completed.
