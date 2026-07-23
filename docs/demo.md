# Reproducible demo evidence

AlgoVista's checked-in demo uses only small synthetic inputs created for this repository. It contains
no user data, downloaded dataset, media, telemetry or third-party transcript.

## Reproduce

From a clean checkout with Node 22 or 24:

```bash
npm ci
npm run demo:verify
```

The verifier builds the production package, generates merge-sort, binary-search, BFS and DFS artifacts
in a temporary directory and compares their exact bytes with `demo/evidence`. It then checks the
manifest field allowlists, byte counts and SHA-256 values, imports each artifact through the public
codec, independently replays it and compares its result with an expectation defined outside the
manifest.

To intentionally regenerate evidence after a reviewed source change:

```bash
npm run demo:generate
git diff -- demo/evidence
```

Review every changed hash and result. A generated diff is not evidence by itself.

## Lineage and limits

`manifest.json` records:

- package version;
- SHA-256 of the generator entrypoint;
- an aggregate SHA-256 over sorted paths and bytes in `src`;
- each artifact's algorithm, byte count, expected result and SHA-256.

The artifact envelope also contains the production codec's canonical payload SHA-256. These hashes
detect stale or altered bytes; they do not authenticate Nguyen Gia Phu or any publisher. The fixtures
show deterministic behavior for the recorded cases, not universal correctness, browser performance
or usability with assistive technology.
