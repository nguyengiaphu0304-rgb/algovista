# ADR-002: Progressive semantic workspace

## Status

Accepted.

## Decision

Ship the first browser workspace as framework-free HTML, CSS and TypeScript over the existing trace
contract. Native form controls, a visible live status and an ordered list are the baseline. Color and
motion enhance the same information but never carry it alone.

Playback owns only a step index and timer. It cannot alter trace content or algorithm results.
Untrusted values are inserted with `textContent`, and the local evidence server sends a restrictive
Content Security Policy.

## Consequences

The UI remains small, auditable and usable when animation is disabled. Full browser tests add a large
development-only dependency and CI must install Chromium. Automated accessibility evidence remains a
regression gate, not a substitute for manual assistive-technology review.
