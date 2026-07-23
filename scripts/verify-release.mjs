import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import { readTarGzip, validatePackageMembers } from "./release-lib.mjs";

const exec = promisify(execFile);
const root = resolve(".");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const MAX_PACKAGE_BYTES = 1_048_576;
const MAX_PACKAGE_FILES = 128;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function filesBelow(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await filesBelow(path)));
    } else if (entry.isFile()) {
      paths.push(path);
    } else {
      throw new Error(`unsupported local package member: ${path}`);
    }
  }
  return paths.sort();
}

async function pack(directory) {
  await mkdir(directory, { recursive: true });
  const { stdout } = await exec("npm", ["pack", "--silent", "--pack-destination", directory], {
    cwd: root,
    env: { ...process.env, npm_config_cache: join(temporary, "npm-cache") },
  });
  const file = stdout.trim().split(/\r?\n/).at(-1);
  if (!file?.endsWith(".tgz")) {
    throw new Error("npm pack did not return a tarball");
  }
  return join(directory, file);
}

const temporary = await mkdtemp(join(tmpdir(), "algovista-release-"));
try {
  const first = await pack(join(temporary, "first"));
  const second = await pack(join(temporary, "second"));
  const firstBytes = await readFile(first);
  const secondBytes = await readFile(second);
  assert.deepEqual(firstBytes, secondBytes, "npm package is not byte-for-byte reproducible");
  assert.ok(firstBytes.length <= MAX_PACKAGE_BYTES, "package exceeds the 1 MiB release budget");

  const localFiles = [
    ...(await filesBelow(join(root, "lib"))),
    ...(await filesBelow(join(root, "web"))),
    join(root, "LICENSE"),
    join(root, "README.md"),
    join(root, "package.json"),
  ];
  const expectedNames = localFiles.map((path) => `package/${relative(root, path)}`);
  const members = readTarGzip(firstBytes);
  assert.ok(members.length <= MAX_PACKAGE_FILES, "package exceeds the 128-file release budget");
  validatePackageMembers(members, expectedNames);
  const byName = new Map(members.map((member) => [member.name, member]));
  for (const path of localFiles) {
    const name = `package/${relative(root, path)}`;
    assert.deepEqual(byName.get(name)?.content, await readFile(path), `${name} content changed`);
  }

  const packedMetadata = JSON.parse(byName.get("package/package.json").content.toString("utf8"));
  assert.equal(packedMetadata.name, "algovista");
  assert.equal(packedMetadata.version, packageJson.version);
  assert.equal(packedMetadata.license, "MIT");
  assert.deepEqual(packedMetadata.engines, { node: ">=22" });
  assert.deepEqual(packedMetadata.exports, packageJson.exports);

  const install = join(temporary, "install");
  await mkdir(install);
  await writeFile(join(install, "package.json"), '{"private":true,"type":"module"}\n');
  await exec(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", first],
    {
      cwd: install,
      env: { ...process.env, npm_config_cache: join(temporary, "npm-cache") },
    },
  );
  await exec(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'import { traceMergeSort, replayTrace } from "algovista"; const t=traceMergeSort([2,1]); if(replayTrace(t.steps).finalSnapshot.join(",")!=="1,2") process.exit(1);',
    ],
    { cwd: install },
  );

  const release = join(root, "release");
  await rm(release, { recursive: true, force: true });
  await mkdir(release);
  const destination = join(release, basename(first));
  await cp(first, destination);
  const digest = sha256(firstBytes);
  await writeFile(join(release, "SHA256SUMS"), `${digest}  ${basename(first)}\n`);
  const manifest = {
    archive: basename(first),
    bytes: (await stat(destination)).size,
    entries: members.length,
    format: "algovista-release-evidence",
    formatVersion: 1,
    packageSha256: digest,
    packageVersion: packageJson.version,
  };
  await writeFile(join(release, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Verified reproducible ${basename(first)} (${members.length} files, ${firstBytes.length} bytes, ${digest}).`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
