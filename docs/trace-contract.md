# Trace contract

Every step contains:

- `schemaVersion`: currently `1`.
- `algorithm`: `merge-sort` or `binary-search`.
- `sequence`: zero-based and contiguous.
- `operation`: semantic action such as `compare`, `write`, `found` or `complete`.
- `snapshot`: complete numeric state after the operation.
- `activeIndices`: positions relevant to the action.
- `metadata`: countable context needed for explanation or verification.

The first step is `start`; the last is `complete`. Only `write` may change a snapshot, and it must
identify exactly one index plus the written value. Merge-sort replay checks sorted order and exact
multiset preservation. Binary-search replay checks ascending input and the first matching result.

Snapshots and metadata deliberately exclude presentation strings. A future UI can localize visible
copy and map operations to concise live-region messages without changing algorithm results.

## Graph trace contract

Graph traces use a separate schema because a visited set and queue/stack frontier are not numeric array
snapshots. Each step contains a schema version, BFS/DFS identity, contiguous sequence, semantic
operation, current node/neighbor and complete immutable `visited`/`frontier` snapshots.

Node labels are non-empty Unicode NFC without surrounding whitespace or null characters and are
limited to 64 code points. Nodes and adjacency lists use locale-independent ordering. Undirected edge
endpoints use canonical order and reversed duplicates are rejected. Graphs are limited to 128 nodes
and 2,048 edges; self-loops are allowed and cycles never cause repeat visits.

BFS uses a queue. Iterative DFS uses a stack and pushes reverse-sorted neighbors so visits occur in
ascending canonical order. Only the component reachable from the requested start node is visited.
Replay reconstructs every expected edge examination, discovery, visit and frontier transition.

## Portable artifact contract

Numeric and graph traces can be wrapped in the versioned canonical artifact described in
[`artifact-format.md`](artifact-format.md). Serialization does not weaken either trace schema:
import reconstructs the relevant immutable domain type and runs its existing replay verifier before
returning it.
