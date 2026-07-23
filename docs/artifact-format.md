# Trace artifact format

AlgoVista trace artifacts are canonical UTF-8 JSON for deterministic local sharing. Format version 1
has exactly four envelope fields:

```json
{"format":"algovista-trace","formatVersion":1,"payload":{"kind":"array","trace":{}},"sha256":"64 lowercase hexadecimal characters"}
```

The illustrative empty trace above is not valid. A real `trace` must satisfy the complete numeric or
graph trace contract and replay successfully.

## Canonical representation

- Object keys are sorted by Unicode code unit.
- Arrays preserve semantic order.
- Numbers must be finite; negative zero serializes as zero.
- No whitespace, trailing newline, unknown field, alternate key order or non-canonical escape is
  accepted.
- `sha256` is the lowercase SHA-256 of the canonical `payload` JSON, not of the full envelope.

Export is deterministic for the same trace. Import rejects input larger than 1,048,576 UTF-8 bytes
before parsing and then enforces a maximum depth of 32 and 200,000 structural values. Existing
algorithm limits remain authoritative: at most 512 numeric values, 128 graph nodes, 2,048 graph edges
and 100,000 trace steps.

## Validation sequence

1. Validate well-formed Unicode and the pre-parse byte limit.
2. Parse JSON and enforce structure limits.
3. Re-serialize and require an exact canonical byte match.
4. Require the exact envelope and payload fields and supported versions.
5. Verify the payload SHA-256.
6. Reconstruct an allowlisted numeric or graph trace into frozen values.
7. Independently replay every transition and validate the result.

Any failure returns no partial trace.

## Security boundary

The adjacent digest is an integrity check, not a digital signature, MAC or publisher identity. A
party that changes a payload can also recompute SHA-256. Consumers needing trusted provenance must
authenticate the complete artifact through an external signing or trusted-delivery mechanism.

The codec does not execute code, fetch remote resources or persist data. Its validation reduces
parser and correctness risks but does not make an untrusted host process safe.
