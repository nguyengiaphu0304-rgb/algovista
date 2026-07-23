import { TraceBuilder } from "./builder.js";
import type { SearchTrace, TraceOptions } from "./types.js";
import {
  TraceValidationError,
  traceBudget,
  validateNumbers,
  validateSorted,
} from "./validation.js";

export function traceBinarySearch(
  input: readonly number[],
  target: number,
  options?: TraceOptions,
): SearchTrace {
  const values = validateNumbers(input);
  if (!Number.isFinite(target)) {
    throw new TraceValidationError("binary-search target must be finite");
  }
  const normalizedTarget = Object.is(target, -0) ? 0 : target;
  validateSorted(values);
  const frozenInput = Object.freeze([...values]);
  const builder = new TraceBuilder("binary-search", traceBudget(options));
  builder.add("start", values, [], { target: normalizedTarget });
  let low = 0;
  let high = values.length - 1;
  let resultIndex = -1;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle];
    if (value === undefined) {
      throw new RangeError("binary-search index escaped the input");
    }
    builder.add("compare", values, [middle], { high, low, middle, target: normalizedTarget });
    if (value >= normalizedTarget) {
      if (value === normalizedTarget) {
        resultIndex = middle;
        builder.add("found", values, [middle], { candidateIndex: middle });
      }
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  builder.add("complete", values, [], { resultIndex, target: normalizedTarget });
  return Object.freeze({
    algorithm: "binary-search",
    input: frozenInput,
    target: normalizedTarget,
    resultIndex,
    steps: builder.finish(),
  });
}
