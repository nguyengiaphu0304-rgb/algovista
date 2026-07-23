import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { importTraceArtifact } from "../lib/index.js";
import { DEMO_CASES, generateDemo, sha256 } from "./demo-lib.mjs";

const evidence = resolve("demo/evidence");
const temporary = await mkdtemp(join(tmpdir(), "algovista-demo-"));

function exactKeys(value, keys, path) {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${path} fields changed`);
}

try {
  await generateDemo(temporary);
  const expectedFiles = [...DEMO_CASES.map((item) => item.file), "manifest.json"].sort();
  assert.deepEqual((await readdir(evidence)).sort(), expectedFiles, "evidence file set changed");
  assert.deepEqual((await readdir(temporary)).sort(), expectedFiles, "generated file set changed");

  for (const file of expectedFiles) {
    assert.deepEqual(
      await readFile(join(evidence, file)),
      await readFile(join(temporary, file)),
      `${file} is stale or non-reproducible`,
    );
  }

  const manifestText = await readFile(join(evidence, "manifest.json"), "utf8");
  assert.ok(manifestText.endsWith("\n"), "manifest must end with one newline");
  const manifest = JSON.parse(manifestText);
  exactKeys(
    manifest,
    ["artifacts", "format", "formatVersion", "generatorSha256", "packageVersion", "sourceSha256"],
    "manifest",
  );
  assert.equal(manifest.format, "algovista-demo-evidence");
  assert.equal(manifest.formatVersion, 1);
  assert.equal(manifest.artifacts.length, DEMO_CASES.length);

  for (const demo of DEMO_CASES) {
    const entry = manifest.artifacts.find((item) => item.file === demo.file);
    assert.ok(entry, `manifest entry missing for ${demo.file}`);
    exactKeys(entry, ["algorithm", "bytes", "expected", "file", "sha256"], demo.file);
    const artifactText = await readFile(join(evidence, demo.file), "utf8");
    assert.equal(entry.algorithm, demo.algorithm);
    assert.equal(entry.bytes, Buffer.byteLength(artifactText));
    assert.equal(entry.sha256, sha256(artifactText));
    assert.deepEqual(entry.expected, demo.expected);
    const trace = await importTraceArtifact(artifactText.trimEnd());
    assert.equal(trace.algorithm, demo.algorithm);
    if ("output" in demo.expected) {
      assert.deepEqual(trace.output, demo.expected.output);
    } else if ("resultIndex" in demo.expected) {
      assert.equal(trace.resultIndex, demo.expected.resultIndex);
    } else {
      assert.deepEqual(trace.order, demo.expected.order);
    }
  }
  console.log(`Verified ${DEMO_CASES.length} reproducible demo artifacts and lineage.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
