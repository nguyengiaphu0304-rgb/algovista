# Architecture

AlgoVista is split into four boundaries:

- `validation` normalizes signed zero, rejects non-finite or oversized inputs and resolves trace
  budgets.
- Algorithm modules own computation and emit semantic steps through `TraceBuilder`. They never retain
  caller-owned arrays.
- `TraceBuilder` creates monotonically sequenced, deeply frozen step data and enforces active-index and
  step-count limits.
- `replay` distrusts traces, validates generic transitions and then applies algorithm-specific final
  invariants.

The core has zero production dependencies and no DOM, network, timer or randomness dependency. A
future UI will consume the public trace contract without importing algorithm internals.

Full snapshots make replay and interview discussion straightforward but use more memory than deltas.
The explicit 512-value and 100,000-step limits keep that choice bounded.

The browser workspace is a presentation adapter in `src/web`. Its controller parses user input,
invokes the public trace generators and replays the result before returning it to the DOM adapter.
Playback state contains only a trace reference, step index and timer. The DOM adapter renders with
native controls, `textContent`, a visible live status and an ordered-list fallback. It never sorts,
searches or modifies snapshots.
