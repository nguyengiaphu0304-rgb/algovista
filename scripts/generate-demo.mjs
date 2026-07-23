import { resolve } from "node:path";

import { generateDemo } from "./demo-lib.mjs";

const output = process.argv[2];
if (!output) {
  throw new Error("usage: node scripts/generate-demo.mjs <output-directory>");
}

const manifest = await generateDemo(resolve(output));
console.log(`Generated ${manifest.artifacts.length} deterministic demo artifacts.`);
