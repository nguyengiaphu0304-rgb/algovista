# Interview guide

## Why not animate inside the algorithm?

That couples correctness to frame timing and UI state. AlgoVista emits a deterministic intermediate
representation. The same trace can drive animation, a textual walkthrough, tests or a screen reader,
and replay can reject inconsistencies before presentation.

## Why full snapshots instead of deltas?

Snapshots are easy to inspect and independently verify. The trade-off is `O(steps × n)` trace memory,
so limits are explicit. A future compact codec can store deltas while preserving the semantic public
contract.

## Why bottom-up merge sort?

It avoids recursion depth as another runtime boundary and exposes partitions predictably. Choosing the
left item on equality preserves stability. The final verifier checks ordering and multiset
preservation independently of the implementation.

## Why first-match binary search?

Returning any duplicate index is often underspecified and hard to teach. Continuing left after a match
gives a deterministic contract that replay can verify with `findIndex`.

## What remains?

The browser milestone demonstrates semantic rendering, keyboard playback, reduced motion and
automated accessibility regression checks. Those gates reduce risk but do not prove real
assistive-technology usability. Manual NVDA/Firefox and VoiceOver/Safari sessions remain an explicit
release gate.

## Why a separate graph trace type?

Array algorithms expose numeric snapshots and active indices. Graph traversals expose visited sets,
edges and a queue or stack. One oversized union would make invalid combinations representable and
weaken replay. Separate versioned schemas keep each invariant explicit while the UI can still adapt
both into shared playback controls.

## How is traversal deterministic?

Labels normalize to Unicode NFC and compare without locale-dependent collation. Undirected edges are
canonicalized, adjacency is sorted, BFS uses FIFO, and DFS pushes reverse-sorted neighbors onto a LIFO
stack. Input node and edge order therefore cannot change the result.

## Why canonical JSON plus replay?

Canonical JSON makes byte output reproducible and gives SHA-256 one unambiguous payload. The digest
detects corruption but is deliberately not described as authentication because anyone can recompute
it. Import therefore reconstructs an allowlisted domain object and independently replays every step;
a matching hash alone is never enough.

## Why not draw the graph on canvas?

A canvas-only view would hide relationships and traversal state from many screen readers and make
keyboard inspection harder. The current workspace uses semantic lists for nodes, edges, visited order
and frontier. CSS adds a visual layer, while the verified trace and text remain the shared source of
truth. A future spatial diagram can be progressive enhancement rather than the only representation.

## What makes the release evidence reproducible?

The demo generator uses only the compiled public API and synthetic fixtures, then records source,
generator and artifact hashes. Verification regenerates into a temporary directory and requires exact
bytes before independent replay. The package is built twice, and archive bytes must match. A strict
tar parser rejects traversal, duplicates and special members before comparing every member with the
local build and smoke-testing an isolated install. This detects drift without claiming that SHA-256
authenticates the publisher.
