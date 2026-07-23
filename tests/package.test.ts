import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_INPUT_LENGTH,
  MAX_TRACE_STEPS,
  TRACE_SCHEMA_VERSION,
  traceBinarySearch,
  traceMergeSort,
} from "../src/index.js";

test("public constants and algorithms are available from the package entrypoint", () => {
  assert.equal(TRACE_SCHEMA_VERSION, 1);
  assert.equal(MAX_INPUT_LENGTH, 512);
  assert.equal(MAX_TRACE_STEPS, 100_000);
  assert.equal(traceMergeSort([2, 1]).output.join(","), "1,2");
  assert.equal(traceBinarySearch([1, 2], 2).resultIndex, 1);
});
