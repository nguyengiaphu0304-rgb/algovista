# ADR-001: Semantic traces before UI

## Status

Accepted.

## Decision

Build and verify a presentation-independent semantic trace engine before adding visualization. Trace
steps use a versioned, immutable schema with complete snapshots and explicit operations. Replay is a
separate consumer that distrusts both algorithm output and caller-provided traces.

## Consequences

Algorithms become deterministic and testable without a browser. Future accessible text and visual
presentations share one source of truth. Full snapshots increase memory, and the repository initially
has less visual impact, so resource limits and a dedicated UI milestone are required.
