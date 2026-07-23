# ADR-004: Canonical trace artifacts

## Status

Accepted

## Context

Users need to share deterministic traces without coupling the core to browser storage, a server or a
presentation framework. Plain `JSON.stringify` output permits representational variation, while
trusting parsed fields or a digest alone could display a forged algorithm result.

## Decision

Use a versioned canonical JSON envelope with an explicit trace family and SHA-256 over the canonical
payload. Bound bytes before parsing and structure immediately afterward. Import exact allowlisted
fields into new frozen domain objects, then run the existing independent numeric or graph replay
verifier.

Keep the codec asynchronous and use Web Crypto available in the supported Node and browser runtimes.
Add no production dependency.

## Consequences

Artifacts are reproducible, portable and resistant to accidental corruption or schema smuggling.
Non-canonical but semantically equivalent JSON is rejected, which simplifies integrity checks at the
cost of interoperability with arbitrary JSON writers. The digest does not authenticate an origin;
trusted distribution requires a separate signature or delivery control.
