/**
 * Visual snapshots: the whole page, both languages, both themes, three sizes.
 *
 * These catch what no assertion thought to look for -- a colour that shifted,
 * a card that moved, an icon that vanished. Everything that changes on its
 * own is pinned: the clock is frozen, both APIs are stubbed, and the two
 * animated GIFs are masked.
 *
 * Baselines record how the page looks *today*, known bugs included. When a bug
 * is fixed the snapshot will differ: look at the diff, and if it is the fix,
 * run `npm run test:update-visual` and commit the new baseline.
 *
 * Baselines are per platform (see playwright.config.ts). Generate them on the
 * platform that runs them -- macOS locally, Linux in CI.
 */
import { expect, test } from "@playwright/test";
import { open, PAGES, setTime } from "./support";

const SIZES = [
  { name: "phone", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
] as const;

for (const { path, lang } of PAGES) {
  for (const theme of ["light", "dark"] as const) {
    for (const size of SIZES) {
      test(`@visual ${lang} ${theme} ${size.name}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await setTime(page, "2026-09-19T15:07:00");
        await open(page, path, { spotify: "listening", weather: "ok" });
        await expect(page).toHaveScreenshot(`${lang}-${theme}-${size.name}.png`, {
          fullPage: true,
          mask: [page.locator('img[src$=".gif"]')],
        });
      });
    }
  }
}

for (const size of [SIZES[0], SIZES[1]]) {
  test(`@visual tech-icon grid at ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await open(page, "/");
    // The grid is where icon clipping and sizing bugs show up, so it gets its
    // own close-up rather than being a few pixels in a full-page shot.
    const grid = page.locator("div").filter({ has: page.locator("svg") }).locator("xpath=self::div[contains(@class,'grid-cols-4')]");
    await expect(grid).toHaveScreenshot(`icon-grid-${size.name}.png`);
  });
}
