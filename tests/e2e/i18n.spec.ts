/**
 * The English and Spanish pages.
 *
 * Copy comes from src/i18n/ui.ts and a few strings are hard-coded inside
 * islands that read <html lang> after hydration; both routes can go wrong
 * independently, so both are checked.
 */
import { expect, test } from "@playwright/test";
import { ui } from "../../src/i18n/ui";
import { knownBug, open, stubExternal } from "./support";

test.describe("page language", () => {
  test("/ is English and /es/ is Spanish, in the html lang attribute", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await open(page, "/es/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  for (const [lang, path, other] of [["en", "/", "es"], ["es", "/es/", "en"]] as const) {
    test(`${lang}: shows its own copy and none of the other language's`, async ({ page }) => {
      await open(page, path);
      const text = await page.locator("body").innerText();
      const own = ui[lang];
      for (const key of ["about.description", "projects-works", "projects-description", "experience-years", "description-github"] as const) {
        expect(text.toLowerCase(), key).toContain(own[key].toLowerCase());
        expect(text.toLowerCase(), `${key} leaked from ${other}`).not.toContain(ui[other][key].toLowerCase());
      }
    });
  }

  test("both pages have the same cards and the same links", async ({ page }) => {
    const inventory = async (path: string) => {
      await open(page, path);
      return page.evaluate(() => ({
        cards: document.querySelectorAll(".clay").length,
        links: [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).filter((h) => h !== "/es" && h !== "/").sort(),
      }));
    };
    const en = await inventory("/");
    const es = await inventory("/es/");
    expect(es.cards).toBe(en.cards);
    expect(es.links).toEqual(en.links);
  });
});

test.describe("switching language", () => {
  test("the EN card goes to /es and the ES card goes back to /", async ({ page }) => {
    await open(page, "/");
    await page.locator('a[href="/es"]').click();
    await expect(page).toHaveURL(/\/es\/?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await page.locator('a[href="/"]').filter({ hasText: /ES/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  for (const [path, active, idle] of [["/", "EN", "ES"], ["/es/", "ES", "EN"]] as const) {
    test(`${path}: the current language is highlighted`, async ({ page }) => {
      await open(page, path);
      const color = (label: string) =>
        page.locator(`a[style*="clay-tint"] span`).filter({ hasText: new RegExp(`^${label}$`) }).evaluate((el) => getComputedStyle(el).color);
      // #e1a028 marks the active language; the other is plain white.
      expect(await color(active)).toBe("rgb(225, 160, 40)");
      expect(await color(idle)).toBe("rgb(255, 255, 255)");
    });
  }
});

test.describe("widgets follow the page language", () => {
  test("Spanish page: Spotify and weather speak Spanish", async ({ page }) => {
    await open(page, "/es/", { spotify: "listening" });
    await expect(page.getByText("Escuchando ahora")).toBeVisible();
    await expect(page.getByText("cielo claro")).toBeVisible();
    await expect(page.getByText("En Chicago", { exact: true })).toBeVisible();
    await expect(page.getByText("Mis Proyectos", { exact: true })).toBeVisible();
  });

  test("English page: Spotify and weather speak English", async ({ page }) => {
    await open(page, "/", { spotify: "listening" });
    await expect(page.getByText("Listening now")).toBeVisible();
    await expect(page.getByText("Clear", { exact: true })).toBeVisible();
    await expect(page.getByText("In Chicago", { exact: true })).toBeVisible();
    await expect(page.getByText("My Projects", { exact: true })).toBeVisible();
  });

  test("the Spanish page's own HTML is Spanish before any JavaScript runs", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await stubExternal(page);
    await page.goto("/es/");
    await expect(page.getByText("Mis Proyectos", { exact: true })).toBeVisible();
    await context.close();
  });
});
