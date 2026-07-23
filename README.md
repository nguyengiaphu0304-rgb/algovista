# AlgoVista

AlgoVista is a correctness-first foundation for teaching and visualizing algorithms. Instead of
coupling algorithm code directly to animation, it produces typed semantic execution traces that can
be replayed and validated before a user interface renders them.

The current milestone includes stable merge sort and first-match binary search. It is an educational
tool, not a benchmark suite or proof that one algorithm is universally best.

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
- Frozen inputs, outputs, steps, snapshots, indices and metadata.
- Bounded inputs and traces with fail-closed validation.
- Replay checks for schema, order, mutations, sort multiset and search result integrity.
- Seeded property-style coverage without live services or nondeterministic fixtures.
- Responsive semantic playback workspace with visible and screen-reader status.
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

## Complexity and evidence

Merge sort uses `O(n log n)` comparisons and `O(n)` working memory. Trace storage is intentionally
larger because every semantic step has a full immutable snapshot. Inputs are therefore limited to
512 values and traces to 100,000 steps. Binary search uses `O(log n)` comparisons over a validated
sorted input.

Tests verify edge cases and 100 deterministically generated arrays. These are correctness checks, not
claims about performance across devices.

## Documentation

- [Architecture](docs/architecture.md)
- [Trace contract](docs/trace-contract.md)
- [Threat model](docs/threat-model.md)
- [Accessibility contract](docs/accessibility.md)
- [Roadmap](docs/roadmap.md)
- [Interview guide](docs/interview-guide.md)
- [ADR-001](docs/adr/001-semantic-traces-before-ui.md)

## Limitations

The repository supports numeric merge sort and binary search only, stores full snapshots rather than
compact deltas and does not execute untrusted user code. Automated browser and axe-core checks are
regression evidence, not proof of usability with every assistive technology. Manual NVDA/Firefox and
VoiceOver/Safari sessions remain required before the v1.0 accessibility gate can be claimed.
