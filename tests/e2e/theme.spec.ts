/** Light/dark mode: it switches, it sticks, and it works without a mouse. */
import { expect, test } from "@playwright/test";
import { knownBug, open } from "./support";

const html = (page: import("@playwright/test").Page) => page.locator("html");
const toggle = (page: import("@playwright/test").Page) => page.locator("#themeToggle");
// The real checkbox is visually hidden (sr-only); a person clicks its track.
const flip = (page: import("@playwright/test").Page) => page.locator("label:has(#themeToggle)").click();

test("starts in light mode with no saved preference", async ({ page }) => {
  await open(page, "/");
  await expect(html(page)).not.toHaveClass(/dark/);
  await expect(toggle(page)).not.toBeChecked();
});

test("the switch turns dark mode on and off", async ({ page }) => {
  await open(page, "/");
  await flip(page);
  await expect(html(page)).toHaveClass(/dark/);
  await expect(toggle(page)).toBeChecked();
  await flip(page);
  await expect(html(page)).not.toHaveClass(/dark/);
});

test("dark mode actually changes the page's colours", async ({ page }) => {
  await open(page, "/");
  const bg = () => page.locator("main").evaluate((el) => getComputedStyle(el).backgroundColor);
  const light = await bg();
  await flip(page);
  const dark = await bg();
  expect(light).toBe("rgb(255, 255, 255)");
  expect(dark).toBe("rgb(19, 21, 26)");
});

test("the choice survives a reload", async ({ page }) => {
  await open(page, "/");
  await flip(page);
  await page.reload();
  await expect(html(page)).toHaveClass(/dark/);
  await expect(toggle(page)).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
});

test("the choice carries over to the other language page", async ({ page }) => {
  await open(page, "/");
  await flip(page);
  await page.locator('a[href="/es"]').click();
  await expect(page).toHaveURL(/\/es\/?$/);
  await expect(html(page)).toHaveClass(/dark/);
  await expect(toggle(page)).toBeChecked();
});

test("a saved dark preference is applied on first load", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await open(page, "/");
  await expect(html(page)).toHaveClass(/dark/);
});

test("it can be operated from the keyboard", async ({ page }) => {
  await open(page, "/");
  await toggle(page).focus();
  await page.keyboard.press("Space");
  await expect(html(page)).toHaveClass(/dark/);
  await page.keyboard.press("Space");
  await expect(html(page)).not.toHaveClass(/dark/);
});

test("the switch has an accessible name", async ({ page }) => {
  knownBug("the checkbox sits inside a <label> that contains only icons, so a screen reader hears an unnamed checkbox");
  await open(page, "/");
  await expect(page.getByRole("checkbox", { name: /dark|theme|mode/i })).toHaveCount(1);
});
