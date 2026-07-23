import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("generates a semantic trace and supports keyboard playback", async ({ page }) => {
  await expect(page.getByLabel("Search target")).toBeHidden();
  await expect(page.getByLabel("Nodes, one per line")).toBeHidden();
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("status")).toContainText("Step 1");
  await expect(page.getByRole("list", { name: "Current values" })).toBeVisible();
  await page.locator("body").press("End");
  await expect(page.getByRole("status")).toContainText("completed");
  await page.locator("body").press("Home");
  await expect(page.getByRole("status")).toContainText("Step 1");
  await page.getByRole("button", { name: "Next" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status")).toContainText("Step 2");
});

test("preserves input while reporting useful errors", async ({ page }) => {
  const input = page.getByLabel("Comma-separated values");
  await input.fill("3, nope, 1");
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("alert")).toContainText("finite number");
  await expect(input).toHaveValue("3, nope, 1");
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
});

test("requires sorted values and a target for binary search", async ({ page }) => {
  await page.getByLabel("Algorithm").selectOption("binary-search");
  await expect(page.getByLabel("Search target")).toBeVisible();
  await page.getByLabel("Comma-separated values").fill("3, 1");
  await page.getByLabel("Search target").fill("1");
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("alert")).toContainText("sorted ascending");
});

test("plays a verified breadth-first graph trace with semantic state", async ({ page }) => {
  await page.getByLabel("Algorithm").selectOption("breadth-first-search");
  await expect(page.getByLabel("Nodes, one per line")).toBeVisible();
  await expect(page.getByLabel("Comma-separated values")).toBeDisabled();
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("status")).toContainText("started breadth-first-search at A");
  await expect(page.getByRole("list", { name: "Graph nodes" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Frontier" })).toContainText("A");
  await page.locator("body").press("End");
  await expect(page.getByRole("status")).toContainText("completed breadth-first-search");
  await expect(page.locator("#summary")).toContainText("A, B, C, D");
  await expect(page.getByRole("list", { name: "Visited order" })).toContainText("D");
});

test("keeps graph input intact and disables playback after graph validation errors", async ({
  page,
}) => {
  await page.getByLabel("Algorithm").selectOption("depth-first-search");
  const edges = page.getByLabel("Edges, one “from -> to” pair per line");
  await edges.fill("A -> Missing");
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("alert")).toContainText("unknown node");
  await expect(edges).toHaveValue("A -> Missing");
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.getByLabel("Algorithm").selectOption("merge-sort");
  await expect(page.getByLabel("Comma-separated values")).toBeEnabled();
  await expect(page.getByLabel("Nodes, one per line")).toBeHidden();
  await expect(page.locator("#error")).toBeEmpty();
  await expect(page.locator("#error")).toBeHidden();
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  await expect(page.getByRole("status")).toContainText("started merge-sort");
});

test("reflows without horizontal overflow at a 200 percent equivalent viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await page.getByLabel("Algorithm").selectOption("breadth-first-search");
  await page.getByRole("button", { name: "Generate verified trace" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("honors reduced motion and has no detectable serious accessibility violations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("body")).toHaveCSS("animation-duration", "0s");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "serious")).toEqual([]);
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
});
