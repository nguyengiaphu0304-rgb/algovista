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
