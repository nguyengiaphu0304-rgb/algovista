import assert from "node:assert/strict";
import test from "node:test";

import { assertSafePackagePath, validatePackageMembers } from "./release-lib.mjs";

test("package path policy rejects traversal, absolute and separator confusion", () => {
  for (const path of [
    "../secret",
    "/package/index.js",
    "package/../secret",
    "package\\index.js",
    "other/index.js",
  ]) {
    assert.throws(() => assertSafePackagePath(path));
  }
  assert.doesNotThrow(() => assertSafePackagePath("package/lib/index.js"));
});

test("package member policy rejects duplicates, special members and allowlist drift", () => {
  const file = { name: "package/lib/index.js", type: "0" };
  assert.throws(() => validatePackageMembers([file, file], [file.name]), /duplicate/);
  assert.throws(() => validatePackageMembers([{ ...file, type: "2" }], [file.name]), /unsupported/);
  assert.throws(
    () => validatePackageMembers([file], [file.name, "package/README.md"]),
    /allowlist/,
  );
});
