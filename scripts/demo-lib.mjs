import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  exportTraceArtifact,
  traceBinarySearch,
  traceBreadthFirstSearch,
  traceDepthFirstSearch,
  traceMergeSort,
} from "../lib/index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export const DEMO_CASES = Object.freeze([
  {
    algorithm: "merge-sort",
    file: "merge-sort.json",
    expected: { output: [-3, 0, 5, 5, 8] },
    create: () => traceMergeSort([8, -3, 5, 5, 0]),
  },
  {
    algorithm: "binary-search",
    file: "binary-search.json",
    expected: { resultIndex: 1 },
    create: () => traceBinarySearch([-2, 0, 0, 4, 9], 0),
  },
  {
    algorithm: "breadth-first-search",
    file: "breadth-first-search.json",
    expected: { order: ["A", "B", "C", "Đ"] },
    create: () =>
      traceBreadthFirstSearch(
        {
          directed: false,
          nodes: ["A", "B", "C", "Đ"],
          edges: [
            ["A", "B"],
            ["A", "C"],
            ["B", "Đ"],
            ["C", "Đ"],
          ],
        },
        "A",
      ),
  },
  {
    algorithm: "depth-first-search",
    file: "depth-first-search.json",
    expected: { order: ["A", "B", "C", "Đ"] },
    create: () =>
      traceDepthFirstSearch(
        {
          directed: true,
          nodes: ["A", "B", "C", "Đ"],
          edges: [
            ["A", "B"],
            ["B", "C"],
            ["C", "Đ"],
          ],
        },
        "A",
      ),
  },
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value) {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
}

async function filesBelow(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await filesBelow(path)));
    } else if (entry.isFile()) {
      paths.push(path);
    }
  }
  return paths.sort();
}

async function sourceLineage() {
  const hash = createHash("sha256");
  for (const path of await filesBelow(join(root, "src"))) {
    hash.update(relative(root, path));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function generateDemo(outputDirectory) {
  await mkdir(outputDirectory, { recursive: true });
  const artifacts = [];
  for (const demo of DEMO_CASES) {
    const text = `${await exportTraceArtifact(demo.create())}\n`;
    await writeFile(join(outputDirectory, demo.file), text, "utf8");
    artifacts.push({
      algorithm: demo.algorithm,
      bytes: Buffer.byteLength(text),
      expected: demo.expected,
      file: demo.file,
      sha256: sha256(text),
    });
  }
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const generatorHash = createHash("sha256");
  for (const generator of ["demo-lib.mjs", "generate-demo.mjs"]) {
    generatorHash.update(generator);
    generatorHash.update("\0");
    generatorHash.update(await readFile(fileURLToPath(new URL(generator, import.meta.url))));
    generatorHash.update("\0");
  }
  const manifest = {
    artifacts,
    format: "algovista-demo-evidence",
    formatVersion: 1,
    generatorSha256: generatorHash.digest("hex"),
    packageVersion: packageJson.version,
    sourceSha256: await sourceLineage(),
  };
  await writeFile(join(outputDirectory, "manifest.json"), `${canonical(manifest)}\n`, "utf8");
  return manifest;
}
