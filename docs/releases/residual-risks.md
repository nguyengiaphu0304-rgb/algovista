# Residual risks

- Automated Chromium and axe-core tests do not establish usability with NVDA/Firefox,
  VoiceOver/Safari or every input mode. Manual sessions remain pending.
- SHA-256 checks detect byte changes but do not authenticate the artifact or package publisher.
- The npm package is not cryptographically signed and no provenance attestation is produced.
- Trace snapshots intentionally trade space for explanation and remain bounded rather than optimized
  for very large classroom datasets.
- Import/export is a library API; the browser workspace does not yet expose file import controls.
- The workspace accepts a small line-oriented graph format, not arbitrary graph files.
- The project does not run user-submitted algorithms, measure asymptotic complexity or prove a trace
  generator correct beyond its independent replay invariants and tested cases.
- Asset and runtime gates are CI regression budgets, not performance claims across devices.
