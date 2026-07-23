# Threat model

Protected properties are deterministic computation, caller-input immutability, trace integrity,
bounded resource use and honest final results.

Expected failures include NaN or infinity, oversized arrays, unsorted search input, invalid indices,
step exhaustion, reordered events, changed snapshots, forged schema versions and altered final search
results. The core rejects these conditions and never evaluates code or performs network requests.

Object freezing prevents accidental mutation in ordinary JavaScript code. It is not a security
boundary against a malicious host with process-level access. Full snapshots can consume significant
memory, so both input and step count are bounded. The current package does not accept arbitrary
comparators because comparator side effects and inconsistent ordering would expand the threat model.

Future UI risks include unsafe text rendering, animation-triggered vestibular discomfort, inaccessible
canvas-only output and denial of service through rapid controls. The UI milestone must use text-safe
rendering, reduced-motion support, keyboard controls and bounded playback.

The current workspace renders values only with `textContent`, uses no remote services or storage and
ships a restrictive CSP in its evidence server. Trace generation retains the core input and step
limits. Playback stops at the final step and rapid input cannot mutate frozen traces. The static demo
server is for local evidence only; it normalizes paths, rejects traversal and is not a production
deployment.

Graph UI input is untrusted text. The adapter accepts only newline-delimited labels and edge lines
with exactly one `->` separator, never HTML or executable syntax. Hidden mode-specific fields are
disabled, mode changes discard the prior playback run, and failed validation leaves the entered text
visible while disabling playback. Core normalization remains authoritative for Unicode collisions,
unknown endpoints, duplicates and resource limits.

Graph-specific untrusted inputs include normalization-colliding labels, unknown endpoints, duplicate
or reversed duplicate edges, cycles and resource-exhaustion graphs. Normalization rejects ambiguity
before execution, limits nodes/edges/steps and never evaluates a label. Replay rejects forged
visited/frontier state, repeated visits, reordered steps, altered results and non-canonical graph data.
These controls protect deterministic teaching output; they are not a graph database security model.

Imported artifact risks include parser resource exhaustion, ambiguous encodings, unknown-field
smuggling, algorithm-family confusion, modified steps and forged results. The codec limits input to
1 MiB before `JSON.parse`, rejects malformed Unicode, caps depth and structural values, requires a
single canonical representation, uses exact field allowlists and replays the reconstructed trace.
SHA-256 detects payload changes only. Because the digest is stored beside the payload and no trusted
key signs it, an attacker can recompute it; replay validation remains the correctness boundary and
the artifact does not authenticate a person, origin or release.
