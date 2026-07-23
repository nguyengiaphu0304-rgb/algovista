import {
  clampedStepIndex,
  createGraphWorkspaceRun,
  createWorkspaceRun,
  describeGraphStep,
  describeStep,
  type GraphWorkspaceRun,
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
const arrayFields = required<HTMLElement>("#array-fields");
const values = required<HTMLInputElement>("#values");
const targetGroup = required<HTMLElement>("#target-group");
const target = required<HTMLInputElement>("#target");
const graphFields = required<HTMLElement>("#graph-fields");
const nodes = required<HTMLTextAreaElement>("#nodes");
const edges = required<HTMLTextAreaElement>("#edges");
const start = required<HTMLInputElement>("#start");
const directed = required<HTMLInputElement>("#directed");
const error = required<HTMLElement>("#error");
const status = required<HTMLElement>("#status");
const summary = required<HTMLElement>("#summary");
const arrayState = required<HTMLElement>("#array-state");
const valueList = required<HTMLOListElement>("#value-list");
const graphState = required<HTMLElement>("#graph-state");
const graphNodeList = required<HTMLUListElement>("#graph-node-list");
const graphEdgeList = required<HTMLUListElement>("#graph-edge-list");
const visitedList = required<HTMLUListElement>("#visited-list");
const frontierList = required<HTMLUListElement>("#frontier-list");
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

function renderGraphState(graphRun: GraphWorkspaceRun, index: number): void {
  const step = graphRun.steps[index];
  if (!step) {
    return;
  }
  graphNodeList.replaceChildren();
  for (const node of graphRun.nodes) {
    const item = document.createElement("li");
    const isCurrent = step.node === node || step.neighbor === node;
    const state = isCurrent
      ? "current"
      : step.visited.includes(node)
        ? "visited"
        : step.frontier.includes(node)
          ? "frontier"
          : "pending";
    item.dataset.state = state;
    item.textContent = node;
    item.setAttribute("aria-label", `${node}: ${state}`);
    graphNodeList.append(item);
  }
  graphEdgeList.replaceChildren();
  for (const [from, to] of graphRun.edges) {
    const item = document.createElement("li");
    item.textContent = `${from} ${graphRun.directed ? "to" : "connected to"} ${to}`;
    graphEdgeList.append(item);
  }
  const renderLabels = (list: HTMLUListElement, labels: readonly string[], empty: string): void => {
    list.replaceChildren();
    if (labels.length === 0) {
      const item = document.createElement("li");
      item.textContent = empty;
      list.append(item);
      return;
    }
    for (const label of labels) {
      const item = document.createElement("li");
      item.textContent = label;
      list.append(item);
    }
  };
  renderLabels(visitedList, step.visited, "None yet");
  renderLabels(frontierList, step.frontier, "Empty");
}

function render(): void {
  const step = run?.steps[stepIndex];
  valueList.replaceChildren();
  graphNodeList.replaceChildren();
  graphEdgeList.replaceChildren();
  visitedList.replaceChildren();
  frontierList.replaceChildren();
  if (!run || !step) {
    const graphSelected =
      algorithm.value === "breadth-first-search" || algorithm.value === "depth-first-search";
    arrayState.hidden = graphSelected;
    graphState.hidden = !graphSelected;
    status.textContent = "Generate a trace to begin.";
    summary.textContent = "";
    progress.value = 0;
    progress.max = 1;
    for (const button of [previous, next, play, reset]) {
      button.disabled = true;
    }
    return;
  }

  let message: string;
  if (run.kind === "array") {
    const arrayStep = run.steps[stepIndex];
    if (!arrayStep) {
      return;
    }
    arrayState.hidden = false;
    graphState.hidden = true;
    arrayStep.snapshot.forEach((value, index) => {
      const item = document.createElement("li");
      item.textContent = String(value);
      item.dataset.active = String(arrayStep.activeIndices.includes(index));
      item.setAttribute(
        "aria-label",
        `Position ${index + 1}: ${value}${arrayStep.activeIndices.includes(index) ? ", active" : ""}`,
      );
      valueList.append(item);
    });
    message = describeStep(arrayStep);
  } else {
    const graphStep = run.steps[stepIndex];
    if (!graphStep) {
      return;
    }
    arrayState.hidden = true;
    graphState.hidden = false;
    renderGraphState(run, stepIndex);
    message = describeGraphStep(graphStep);
  }
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

function setAlgorithmVisibility(): void {
  const graph =
    algorithm.value === "breadth-first-search" || algorithm.value === "depth-first-search";
  const searching = !graph && algorithm.value === "binary-search";
  arrayFields.hidden = graph;
  graphFields.hidden = !graph;
  values.disabled = graph;
  targetGroup.hidden = !searching;
  target.disabled = graph || !searching;
  target.required = searching;
  for (const field of [nodes, edges, start, directed]) {
    field.disabled = !graph;
  }
  nodes.required = graph;
  start.required = graph;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  stopPlayback();
  error.textContent = "";
  try {
    if (algorithm.value === "breadth-first-search" || algorithm.value === "depth-first-search") {
      run = createGraphWorkspaceRun(
        algorithm.value,
        nodes.value,
        edges.value,
        start.value,
        directed.checked,
      );
    } else {
      run = createWorkspaceRun(
        algorithm.value === "binary-search" ? "binary-search" : "merge-sort",
        values.value,
        target.value,
      );
    }
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

algorithm.addEventListener("change", () => {
  stopPlayback();
  run = null;
  stepIndex = 0;
  error.textContent = "";
  setAlgorithmVisibility();
  render();
});
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

setAlgorithmVisibility();
render();
