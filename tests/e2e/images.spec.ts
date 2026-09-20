/**
 * Images and network health.
 *
 * Regression: "Fix invisible background images and add placeholder assets".
 * An image that 404s, or that renders but sits behind something opaque, looks
 * like a blank card, so these check both that the file arrives and that it is
 * actually on screen.
 */
import { expect, test } from "@playwright/test";
import { knownBug, open, PAGES } from "./support";

for (const { path, lang } of PAGES) {
  test.describe(`${lang} images`, () => {
    test("every visible image loads", async ({ page }) => {
      await open(page, path);
      const broken = await page.evaluate(() =>
        [...document.images]
          .filter((img) => img.getClientRects().length > 0) // skip display:none (the avatar)
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.getAttribute("src")),
      );
      expect(broken).toEqual([]);
    });

    test("every image has alt text", async ({ page }) => {
      await open(page, path);
      const missing = await page.evaluate(() =>
        [...document.images].filter((img) => !img.hasAttribute("alt")).map((img) => img.getAttribute("src")),
      );
      expect(missing).toEqual([]);
    });

    test("the two card backgrounds are actually visible, not just loaded", async ({ page }) => {
      await open(page, path);
      const hidden = await page.evaluate(() => {
        const names = ["Projects", "GitHub"];
        return names.flatMap((alt) => {
          const img = document.querySelector(`img[alt="${alt}"]`) as HTMLImageElement | null;
          if (!img) return [`${alt}: not found`];
          // elementsFromPoint only answers for points inside the viewport.
          img.scrollIntoView({ block: "center" });
          const style = getComputedStyle(img);
          const r = img.getBoundingClientRect();
          const problems: string[] = [];
          if (style.display === "none" || style.visibility === "hidden") problems.push("hidden by CSS");
          if (Number(style.opacity) < 0.5) problems.push(`opacity ${style.opacity}`);
          if (r.width < 20 || r.height < 20) problems.push(`only ${Math.round(r.width)}x${Math.round(r.height)}px`);
          const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!stack.includes(img)) problems.push("something opaque is stacked over it");
          return problems.map((p) => `${alt}: ${p}`);
        });
      });
      expect(hidden).toEqual([]);
    });

    test("nothing on the page 404s, errors, or throws", async ({ page }) => {
      const problems: string[] = [];
      page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
      page.on("console", (m) => {
        // The stubbed APIs answer with fixtures; only *our* errors matter.
        if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text()}`);
      });
      page.on("response", (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === new URL(page.url() || "http://127.0.0.1:4322").origin) {
          problems.push(`${r.status()} ${r.url()}`);
        }
      });
      await open(page, path);
      expect(problems).toEqual([]);
    });

    test("the page stays under a 1 MB transfer budget", async ({ page }) => {
      let bytes = 0;
      const pending: Promise<void>[] = [];
      page.on("response", (r) => {
        if (new URL(r.url()).protocol.startsWith("http")) {
          pending.push(r.body().then((b) => void (bytes += b.length)).catch(() => undefined));
        }
      });
      await open(page, path);
      await Promise.all(pending);
      expect(bytes).toBeLessThan(1_000_000);
    });
  });
}

test("a Spotify album image that fails to load falls back to the offline art", async ({ page }) => {
  knownBug("SpotifyStatus has no onError handler, so an expired album-art URL shows a broken image");
  await open(page, "/", { spotify: "bad-art" });
  const ok = await page.evaluate(() => {
    const img = [...document.images].find((i) => i.alt === "Spotify Album" && i.getClientRects().length > 0);
    return !!img && img.complete && img.naturalWidth > 0;
  });
  expect(ok).toBe(true);
});
