import { statSync } from "node:fs";

const budgets = new Map([
  ["web/index.html", 12 * 1024],
  ["web/styles.css", 16 * 1024],
  ["lib/web/app.js", 20 * 1024],
  ["lib/web/controller.js", 16 * 1024],
]);

for (const [path, maximum] of budgets) {
  const size = statSync(path).size;
  if (size > maximum) {
    throw new Error(`${path} is ${size} bytes; budget is ${maximum} bytes`);
  }
  console.log(`${path}: ${size}/${maximum} bytes`);
}
