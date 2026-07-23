import {
  type AlgorithmId,
  TRACE_SCHEMA_VERSION,
  type TraceMetadata,
  type TraceOperation,
  type TraceStep,
} from "./types.js";
import { TraceBudgetError } from "./validation.js";

export class TraceBuilder {
  readonly #algorithm: AlgorithmId;
  readonly #maxSteps: number;
  readonly #steps: TraceStep[] = [];

  constructor(algorithm: AlgorithmId, maxSteps: number) {
    this.#algorithm = algorithm;
    this.#maxSteps = maxSteps;
  }

  add(
    operation: TraceOperation,
    snapshot: readonly number[],
    activeIndices: readonly number[] = [],
    metadata: TraceMetadata = {},
  ): void {
    if (this.#steps.length >= this.#maxSteps) {
      throw new TraceBudgetError(`trace exceeds ${this.#maxSteps} steps`);
    }
    for (const index of activeIndices) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= snapshot.length) {
        throw new TraceBudgetError("trace contains an invalid active index");
      }
    }
    const step = Object.freeze({
      schemaVersion: TRACE_SCHEMA_VERSION,
      algorithm: this.#algorithm,
      sequence: this.#steps.length,
      operation,
      snapshot: Object.freeze([...snapshot]),
      activeIndices: Object.freeze([...activeIndices]),
      metadata: Object.freeze({ ...metadata }),
    });
    this.#steps.push(step);
  }

  finish(): readonly TraceStep[] {
    return Object.freeze([...this.#steps]);
  }
}
