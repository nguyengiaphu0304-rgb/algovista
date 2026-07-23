# ADR-006: Verify demos and packages from production boundaries

## Status

Accepted for the v1.0 release candidate.

## Context

Screenshots alone cannot prove that a displayed trace came from the current implementation. Likewise,
an npm archive can contain stale, unexpected or unsafe members even when the source checkout looks
correct. Release evidence must be reproducible, inspectable and honest about what it does not prove.

## Decision

Generate four synthetic canonical artifacts through the compiled public API. Commit them with a
strict manifest containing artifact, generator and source lineage. Regenerate into a temporary
directory in CI and require byte equality before importing and independently replaying each artifact.

Pack twice and require identical bytes. Parse the gzip/tar archive without extraction, verify header
checksums, reject unsafe paths, duplicates and non-regular members, require an exact allowlist and
compare every archived byte with the build. Install with scripts disabled in an isolated temporary
project and execute a public-API smoke test. Upload the resulting archive, SHA256SUMS and manifest.

## Consequences

The evidence is deterministic, offline and reviewable, and package drift fails the build. Full
artifact snapshots and duplicate packing add CI time but remain within the project's explicit
budgets. SHA-256 provides integrity, not publisher authentication. Manual assistive-technology
sessions and GitHub Release publication remain separate gates.
