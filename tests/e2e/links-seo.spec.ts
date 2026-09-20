/** Links, metadata, document structure, and things that must never ship. */
import { expect, test } from "@playwright/test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { knownBug, open, PAGES } from "./support";

test.describe("links", () => {
  test("external links open safely in a new tab", async ({ page }) => {
    await open(page, "/");
    const unsafe = await page.evaluate(() =>
      [...document.querySelectorAll("a[target=_blank]")]
        .filter((a) => /^https?:/.test(a.getAttribute("href") ?? ""))
        .filter((a) => !/noopener/.test(a.getAttribute("rel") ?? ""))
        .map((a) => a.getAttribute("href")),
    );
    expect(unsafe).toEqual([]);
  });

  test("the mail link uses a plain mailto: with no forced new tab", async ({ page }) => {
    knownBug("the mailto: card has target=_blank, which opens a blank tab in some browsers before the mail app");
    await open(page, "/");
    const mail = page.locator('a[href^="mailto:"]');
    await expect(mail).toHaveCount(1);
    await expect(mail).not.toHaveAttribute("target", "_blank");
  });

  test("the résumé link serves a PDF", async ({ page, request }) => {
    await open(page, "/");
    const href = await page.locator('a[href$=".pdf"]').getAttribute("href");
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("pdf");
    expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("every internal link resolves", async ({ page, request }) => {
    await open(page, "/");
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")!).filter((h) => h?.startsWith("/")),
    );
    for (const href of new Set(hrefs)) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });
});

for (const { path, lang } of PAGES) {
  test.describe(`${lang} document`, () => {
    test("has a title, a language, a viewport meta and a favicon", async ({ page, request }) => {
      await open(page, path);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /width=device-width/);
      const icon = await page.locator('link[rel="icon"]').getAttribute("href");
      expect((await request.get(icon!)).status()).toBe(200);
    });

    test("has exactly one h1 and never skips a heading level", async ({ page }) => {
      await open(page, path);
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1])),
      );
      expect(levels.filter((l) => l === 1)).toHaveLength(1);
      levels.forEach((level, i) => {
        if (i > 0) expect(level - levels[i - 1], `h${levels[i - 1]} → h${level}`).toBeLessThanOrEqual(1);
      });
    });

    test("its meta description is the page's own description", async ({ page }) => {
      knownBug("Layout.astro hard-codes content='Astro description' and ignores the description prop each page passes");
      await open(page, path);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description).not.toBe("Astro description");
      expect(description!.length).toBeGreaterThan(40);
    });
  });
}

test.describe("things that must never ship", () => {
  // Client-side JavaScript is public. A key in it is a key anyone can copy.
  const SECRET = /(app_?id|api_?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i;

  function sourceFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? sourceFiles(full) : /\.(js|jsx|ts|tsx|astro|mjs)$/.test(name) ? [full] : [];
    });
  }

  test("no API key is committed in client-side source", async () => {
    knownBug("src/services/getWeather.js hard-codes an OpenWeatherMap key that is sent to every visitor's browser");
    const hits = sourceFiles("src").filter((file) => SECRET.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });

  test("no API key is present in the built JavaScript", async () => {
    knownBug("the OpenWeatherMap key is bundled into the built client JavaScript");
    // Minified code renames every variable, so look for the shape of the leak:
    // a bundle that talks to OpenWeatherMap and holds a 32-character hex literal.
    const hits = sourceFiles("dist").filter((file) => {
      const code = readFileSync(file, "utf8");
      return /openweathermap/.test(code) && /["'][a-f0-9]{32}["']/.test(code);
    });
    expect(hits).toEqual([]);
  });
});
