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

The controller returns a discriminated `array` or `graph` workspace run. Graph text fields use an
explicit one-node-per-line and `from -> to` edge contract, then delegate normalization and all graph
invariants to the core. The DOM adapter narrows on the run kind and cannot read numeric snapshots as
graph state. Graph rendering derives node state, visited order and frontier only from the verified
step.

Graph traversal has four parallel boundaries: normalization creates canonical immutable graph data;
adjacency construction derives sorted neighbors; BFS/DFS generators own queue or stack execution; and
graph replay independently reconstructs every transition. A separate graph schema avoids weakening
the numeric-array invariants or translating meaningful node labels into opaque numbers.

`trace-codec` is a serialization boundary over both trace families. Export canonicalizes a bounded
trace, assigns its family and hashes the canonical payload. Import limits UTF-8 bytes before parsing,
limits structural depth and values, requires byte-for-byte canonical JSON, verifies the hash, rebuilds
only exact allowlisted fields and then invokes the appropriate independent replay verifier. Imported
arrays, records and traces are frozen before they cross the public API.

Release evidence is a separate offline boundary. `generate-demo` invokes only the compiled public API
and records four synthetic trace artifacts plus hashes of each artifact, the generator and the full
TypeScript source tree. `verify-demo` regenerates into a temporary directory, requires the exact file
set and bytes, imports every artifact and checks an independently defined expected result.

`verify-release` runs `npm pack` twice and requires identical archive bytes. It parses gzip/tar without
extracting it, verifies header checksums, permits only regular files under `package/`, rejects
traversal, duplicates and special members, and compares the exact archive allowlist and bytes with
the local build. It then installs the archive with scripts disabled in an isolated temporary project
and smoke-tests the public API. CI uploads only the package, its checksum and the release manifest.
