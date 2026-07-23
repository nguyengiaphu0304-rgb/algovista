import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("generates a semantic trace and supports keyboard playback", async ({ page }) => {
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

test("reflows without horizontal overflow at a 200 percent equivalent viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 800 });
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
