import { TraceBuilder } from "./builder.js";
import type { SortTrace, TraceOptions } from "./types.js";
import { traceBudget, validateNumbers } from "./validation.js";

export function traceMergeSort(input: readonly number[], options?: TraceOptions): SortTrace {
  const values = validateNumbers(input);
  const original = Object.freeze([...values]);
  const builder = new TraceBuilder("merge-sort", traceBudget(options));
  builder.add("start", values, [], { length: values.length });

  for (let width = 1; width < values.length; width *= 2) {
    for (let left = 0; left < values.length; left += width * 2) {
      const middle = Math.min(left + width, values.length);
      const right = Math.min(left + width * 2, values.length);
      builder.add("partition", values, [], { left, middle, right, width });
      const merged: number[] = [];
      let first = left;
      let second = middle;
      while (first < middle && second < right) {
        builder.add("compare", values, [first, second], { left: first, right: second });
        const firstValue = values[first];
        const secondValue = values[second];
        if (firstValue === undefined || secondValue === undefined) {
          throw new RangeError("merge-sort index escaped its partition");
        }
        if (firstValue <= secondValue) {
          merged.push(firstValue);
          first += 1;
        } else {
          merged.push(secondValue);
          second += 1;
        }
      }
      merged.push(...values.slice(first, middle), ...values.slice(second, right));
      for (let offset = 0; offset < merged.length; offset += 1) {
        const index = left + offset;
        const writtenValue = merged[offset];
        if (writtenValue === undefined) {
          throw new RangeError("merge-sort produced an incomplete partition");
        }
        values[index] = writtenValue;
        builder.add("write", values, [index], { writtenValue });
      }
    }
  }

  builder.add("complete", values, [], { length: values.length });
  return Object.freeze({
    algorithm: "merge-sort",
    input: original,
    output: Object.freeze([...values]),
    steps: builder.finish(),
  });
}
