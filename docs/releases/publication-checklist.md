# v1.0 publication checklist

## Automated gates

- [x] Strict TypeScript, formatting and linting.
- [x] Deterministic unit, property-style, tamper and boundary tests.
- [x] Chromium keyboard, reflow, reduced-motion and axe-core regression tests.
- [x] Asset budgets.
- [x] Reproducible synthetic demo artifacts and lineage verification.
- [x] Byte-for-byte reproducible package, exact archive allowlist and isolated import smoke test.
- [x] Dependency audit with no known high-severity vulnerability.

These checked items describe repeatable repository checks, not a manual session or published release.

## Manual accessibility gates

- [ ] Record current NVDA and Firefox versions, date, keyboard path and spoken output.
- [ ] Record current VoiceOver and Safari versions, date, keyboard path and spoken output.
- [ ] Review 200% and 400% browser zoom, forced colors and high-contrast settings.
- [ ] Record any defect and resolve it or document its user impact before release.

## Publication gates

- [ ] Confirm `main` commit and its required CI checks.
- [ ] Create annotated tag `v1.0.0` at that exact verified commit.
- [ ] Publish a non-prerelease GitHub Release using `docs/releases/v1.0.0.md`.
- [ ] Attach the CI-produced `algovista-1.0.0.tgz`, `SHA256SUMS` and `manifest.json`.
- [ ] Download attachments, verify checksums and run the isolated import smoke test.
- [ ] Record the release URL and close the publication issue.
