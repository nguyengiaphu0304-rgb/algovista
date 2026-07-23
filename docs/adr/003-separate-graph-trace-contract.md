# ADR-003: Separate graph trace contract

## Status

Accepted.

## Decision

Graph traversal uses a dedicated trace contract instead of encoding node identifiers as numbers in the
array-algorithm schema. A graph trace carries canonical nodes and edges, semantic edge/discovery/visit
operations, and explicit visited/frontier snapshots.

Graphs are normalized before execution. Node labels use Unicode NFC, neighbors use a locale-independent
code-unit order, and undirected edges use a canonical endpoint order. Replay independently rebuilds
the adjacency map and expected queue or stack transitions.

## Consequences

The existing merge-sort and binary-search API stays backward compatible. Graph traces can represent
meaningful string labels without unsafe numeric aliases. The cost is a second versioned schema and
more replay code; shared abstractions should be introduced only when their invariants genuinely match.
