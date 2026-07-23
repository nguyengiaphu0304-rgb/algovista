import {
  clampedStepIndex,
  createWorkspaceRun,
  describeStep,
  type WorkspaceRun,
} from "./controller.js";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required workspace element is missing: ${selector}`);
  }
  return element;
}

const form = required<HTMLFormElement>("#trace-form");
const algorithm = required<HTMLSelectElement>("#algorithm");
const values = required<HTMLInputElement>("#values");
const targetGroup = required<HTMLElement>("#target-group");
const target = required<HTMLInputElement>("#target");
const error = required<HTMLElement>("#error");
const status = required<HTMLElement>("#status");
const summary = required<HTMLElement>("#summary");
const valueList = required<HTMLOListElement>("#value-list");
const progress = required<HTMLProgressElement>("#progress");
const previous = required<HTMLButtonElement>("#previous");
const next = required<HTMLButtonElement>("#next");
const play = required<HTMLButtonElement>("#play");
const reset = required<HTMLButtonElement>("#reset");

let run: WorkspaceRun | null = null;
let stepIndex = 0;
let timer: number | null = null;

function stopPlayback(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  play.textContent = "Play";
  play.setAttribute("aria-pressed", "false");
}

function render(): void {
  const step = run?.steps[stepIndex];
  valueList.replaceChildren();
  if (!run || !step) {
    status.textContent = "Generate a trace to begin.";
    summary.textContent = "";
    progress.value = 0;
    progress.max = 1;
    for (const button of [previous, next, play, reset]) {
      button.disabled = true;
    }
    return;
  }

  step.snapshot.forEach((value, index) => {
    const item = document.createElement("li");
    item.textContent = String(value);
    item.dataset.active = String(step.activeIndices.includes(index));
    item.setAttribute(
      "aria-label",
      `Position ${index + 1}: ${value}${step.activeIndices.includes(index) ? ", active" : ""}`,
    );
    valueList.append(item);
  });
  const message = describeStep(step);
  status.textContent = message;
  summary.textContent = run.summary;
  progress.max = run.steps.length;
  progress.value = stepIndex + 1;
  previous.disabled = stepIndex === 0;
  next.disabled = stepIndex === run.steps.length - 1;
  play.disabled = run.steps.length < 2;
  reset.disabled = false;
  if (stepIndex === run.steps.length - 1) {
    stopPlayback();
  }
}

function move(delta: number): void {
  if (!run) {
    return;
  }
  stepIndex = clampedStepIndex(stepIndex, delta, run.steps.length);
  render();
}

function togglePlayback(): void {
  if (!run || run.steps.length < 2) {
    return;
  }
  if (timer !== null) {
    stopPlayback();
    return;
  }
  if (stepIndex === run.steps.length - 1) {
    stepIndex = 0;
  }
  play.textContent = "Pause";
  play.setAttribute("aria-pressed", "true");
  timer = window.setInterval(() => move(1), 700);
}

function setTargetVisibility(): void {
  const searching = algorithm.value === "binary-search";
  targetGroup.hidden = !searching;
  target.disabled = !searching;
  target.required = searching;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  stopPlayback();
  error.textContent = "";
  try {
    run = createWorkspaceRun(
      algorithm.value === "binary-search" ? "binary-search" : "merge-sort",
      values.value,
      target.value,
    );
    stepIndex = 0;
    render();
    status.focus();
  } catch (caught) {
    run = null;
    render();
    error.textContent =
      caught instanceof Error ? caught.message : "The trace could not be generated.";
    error.focus();
  }
});

algorithm.addEventListener("change", setTargetVisibility);
previous.addEventListener("click", () => move(-1));
next.addEventListener("click", () => move(1));
play.addEventListener("click", togglePlayback);
reset.addEventListener("click", () => {
  stopPlayback();
  stepIndex = 0;
  render();
  status.focus();
});

document.addEventListener("keydown", (event) => {
  const targetElement = event.target;
  if (
    targetElement instanceof HTMLInputElement ||
    targetElement instanceof HTMLSelectElement ||
    targetElement instanceof HTMLTextAreaElement
  ) {
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    move(1);
  } else if (event.key === " ") {
    event.preventDefault();
    togglePlayback();
  } else if (event.key === "Home" && run) {
    event.preventDefault();
    stopPlayback();
    stepIndex = 0;
    render();
  } else if (event.key === "End" && run) {
    event.preventDefault();
    stopPlayback();
    stepIndex = run.steps.length - 1;
    render();
  }
});

setTargetVisibility();
render();
