# ADR-005: Semantic graph playback before spatial diagrams

## Status

Accepted

## Context

The BFS/DFS engine was library-only. A conventional node-link canvas would be visually familiar but
would create a second, inaccessible state model and require layout behavior unrelated to traversal
correctness.

## Decision

Extend the existing workspace with a discriminated graph presentation model. Parse a deliberately
small line-oriented input, delegate validation and traversal to the core, replay the result, and
render nodes, edges, visited order and frontier as native lists. Reuse the existing playback controls,
keyboard shortcuts, progress element and live-status region.

Node state is expressed in accessible names and visible text categories. Color is supplemented by
solid, dashed and double border treatments. A spatial visualization may be added later only as a
progressive enhancement over this semantic representation.

## Consequences

The same verified graph steps are usable visually, by keyboard and through screen-reader navigation
without a framework or production dependency. The list view does not communicate geometric topology
and the text adapter intentionally cannot represent labels containing its newline or edge delimiter.
Those are documented UI limits, not changes to the broader core graph schema.
