import { MAX_INPUT_LENGTH, MAX_TRACE_STEPS, type TraceOptions } from "./types.js";

export class TraceValidationError extends Error {
  override readonly name: string = "TraceValidationError";
}

export class TraceBudgetError extends TraceValidationError {
  override readonly name = "TraceBudgetError";
}

export function validateNumbers(values: readonly number[]): number[] {
  if (values.length > MAX_INPUT_LENGTH) {
    throw new TraceValidationError(`input exceeds ${MAX_INPUT_LENGTH} values`);
  }
  return values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new TraceValidationError("input values must be finite numbers");
    }
    return Object.is(value, -0) ? 0 : value;
  });
}

export function validateSorted(values: readonly number[]): void {
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined || previous > current) {
      throw new TraceValidationError("binary-search input must be sorted ascending");
    }
  }
}

export function traceBudget(options: TraceOptions | undefined): number {
  const value = options?.maxSteps ?? MAX_TRACE_STEPS;
  if (!Number.isSafeInteger(value) || value < 2 || value > MAX_TRACE_STEPS) {
    throw new TraceValidationError(`maxSteps must be between 2 and ${MAX_TRACE_STEPS}`);
  }
  return value;
}
