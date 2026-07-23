# Roadmap

## v0.1 deterministic trace engine

- [x] Versioned semantic trace schema
- [x] Stable merge-sort and first-match binary-search generators
- [x] Independent replay verifier and resource limits
- [x] Edge-case and seeded property-style tests
- [x] Package, CI and architecture documentation

## v0.2 accessible visual workspace

- [x] Responsive array visualization with semantic HTML fallback
- [x] Keyboard playback, focus management and visible status
- [x] Screen-reader narration and reduced-motion behavior
- [x] 200% zoom/reflow and automated browser accessibility tests

## v1.0 portfolio release

- [x] Graph traversal trace engine with deterministic fixtures
- [x] Accessible BFS/DFS graph playback workspace
- [x] Shareable, validated trace import/export
- [x] Performance and accessibility budgets
- [x] Reproducible demo evidence, release notes and verified package
- [ ] Manual NVDA/Firefox and VoiceOver/Safari accessibility evidence

Automated and package gates are complete for the v1.0 release candidate. The remaining manual
assistive-technology sessions are intentionally not inferred from Chromium or axe-core results.

## v0.3 deterministic graph traces

- [x] Canonical directed and undirected graph model
- [x] Deterministic BFS and iterative DFS
- [x] Independent graph replay verifier
- [x] Cyclic, disconnected, self-loop, adversarial and seeded fixtures

## v0.4 validated trace artifacts

- [x] Versioned canonical JSON envelope
- [x] SHA-256 payload-integrity check
- [x] Exact schema reconstruction and independent replay
- [x] Pre-parse byte, depth and structure limits
- [x] Deterministic round-trip and tamper fixtures

## v0.5 accessible graph workspace

- [x] Discriminated numeric and graph presentation models
- [x] Bounded line-oriented graph input adapter
- [x] Semantic node, edge, visited and frontier lists
- [x] Shared keyboard playback and live-status narration
- [x] Graph validation, reflow and browser accessibility regression tests
