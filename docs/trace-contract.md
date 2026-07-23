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
