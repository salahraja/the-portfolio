/**
 * Accessibility, scanned with axe-core.
 *
 * Both pages, both themes, a phone and a laptop. Contrast is the check most
 * likely to break when the theme changes, so dark mode is scanned too.
 *
 * KNOWN lists what axe reports today (rule id -> why). A violation not in that
 * list fails the suite, so the list can only shrink; when something is fixed,
 * delete its entry.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open, PAGES } from "./support";

const KNOWN: Record<string, string> = {
  "color-contrast": "orange 'Salah' heading (#e1a028) and the white 'years of experience' label on mint (#6DD2B7) are below 4.5:1",
  label: "the dark-mode checkbox #themeToggle has no accessible name",
  "link-name": "icon-only links (LinkedIn, mail, and a tailwindcss.com tile) have no text or aria-label",
};

for (const { path, lang } of PAGES) {
  for (const theme of ["light", "dark"] as const) {
    for (const viewport of [{ width: 375, height: 667 }, { width: 1280, height: 800 }]) {
      test(`${lang} ${theme} ${viewport.width}px: no new accessibility violations`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await open(page, path, { spotify: "listening" });

        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();

        const fresh = violations.filter((v) => !(v.id in KNOWN));
        test.info().annotations.push(...violations.filter((v) => v.id in KNOWN).map((v) => ({ type: "known", description: `${v.id}: ${KNOWN[v.id]}` })));
        expect(
          fresh.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
        ).toEqual([]);
      });
    }
  }
}
