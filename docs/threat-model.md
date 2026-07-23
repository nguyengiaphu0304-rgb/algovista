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
