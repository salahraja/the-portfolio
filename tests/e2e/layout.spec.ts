/**
 * Layout regression tests.
 *
 * Nearly every recent commit on this site fixed a layout bug that only shows
 * at particular widths: a grid busting out of its card at tablet/laptop sizes,
 * bio text overlapping from a misapplied line-clamp, icons sizing
 * inconsistently, a tiny icon grid on mobile, the /es page a different width
 * from /. Each check below pins one of those classes of bug, at every width and
 * on both language pages, so it cannot quietly come back.
 */
import { expect, test, type Page } from "@playwright/test";
import { knownBug, open, PAGES, VIEWPORTS } from "./support";

const EPS = 0.5; // sub-pixel rounding

// Tight boxes around the text a person actually sees. A paragraph's own box
// stretches to its column width, so comparing those reports overlaps that are
// not visible; a Range around its text gives the real extent, and skipping
// elements with no client rects skips anything display:none.
const TEXT_RECTS_JS = `
  const textRect = (el) => {
    if (!el.getClientRects().length) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };
`;

// Cards that get their own "shows all of its text" test. `knownBad` lists the
// widths at which each is currently cut off, per language; a known-bad entry
// that starts passing makes Playwright report "expected to fail but passed",
// which is the cue to delete it.
const CARD_TESTS: {
  name: string;
  match: string;
  bug: string;
  knownBad: Partial<Record<"en" | "es", number[]>>;
}[] = [
  { name: "years of experience", match: "years of experience|años de experiencia", bug: "from 768px up, the text-8xl '2' plus its uppercase label are taller than the square card and get cut off", knownBad: {} },
  { name: "GitHub", match: "^github", bug: "the description wraps to more lines than the fixed 140px card holds", knownBad: {} },
  { name: "Projects", match: "projects and works|proyectos y trabajos", bug: "at 320px the description is cut off mid-sentence ('Follow this link to see my p…')", knownBad: {} },
  { name: "intro", match: "assalaalaikum|hola, soy", bug: "intro copy runs past the card", knownBad: {} },
];
const CARDS_WITH_OWN_TESTS = ["years of experience", "años de experiencia", "github", "projects and works", "proyectos y trabajos", "loading", "°"];


for (const { path, lang } of PAGES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${lang} ${viewport.width}px`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await open(page, path);
      });

      test("the page never scrolls sideways", async ({ page }) => {
        const overflow = await page.evaluate(() => ({
          html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          body: document.body.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(overflow.html).toBeLessThanOrEqual(0);
        expect(overflow.body).toBeLessThanOrEqual(0);
      });

      test("every card stays inside the viewport", async ({ page }) => {
        const escaped = await page.evaluate(() =>
          [...document.querySelectorAll("section > *")]
            .map((el) => ({ el: el.tagName + "." + (el.getAttribute("href") ?? el.className).slice(0, 40), r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && (r.left < -0.5 || r.right > window.innerWidth + 0.5))
            .map(({ el }) => el),
        );
        expect(escaped).toEqual([]);
      });

      test("no two cards overlap", async ({ page }) => {
        const overlaps = await page.evaluate(() => {
          const cells = [...document.querySelectorAll("section > *")]
            .map((el, index) => ({ index, name: (el.getAttribute("href") ?? el.className).slice(0, 30), r: el.getBoundingClientRect() }))
            .filter(({ r }) => r.width > 0 && r.height > 0);
          const found: string[] = [];
          for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
              const a = cells[i].r, b = cells[j].r;
              const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (w > 1 && h > 1) found.push(`${cells[i].name} × ${cells[j].name} (${Math.round(w)}×${Math.round(h)}px)`);
            }
          }
          return found;
        });
        expect(overlaps).toEqual([]);
      });

      test("no card silently clips its own content", async ({ page }) => {
        // A card with overflow-hidden cuts off whatever does not fit, which is
        // how "text overlap" and "grid busting out" show up. Cards with their
        // own test below are excluded so a known bug is reported once, there.
        const clipped = await page.evaluate((named) => {
          const label = (el: Element) => (el.getAttribute("href") ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
          return [...document.querySelectorAll(".clay")]
            .filter((el) => getComputedStyle(el).overflow !== "visible")
            .filter((el) => !named.some((n) => label(el).toLowerCase().includes(n) || (el.textContent ?? "").toLowerCase().includes(n)))
            .map((el) => ({ name: label(el), x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }))
            .filter(({ x, y }) => x > 1 || y > 1)
            .map(({ name, x, y }) => `"${name}": +${x}px wide, +${y}px tall`);
        }, CARDS_WITH_OWN_TESTS);
        expect(clipped).toEqual([]);
      });

      for (const card of CARD_TESTS) {
        test(`the ${card.name} card shows all of its text`, async ({ page }) => {
          const known = card.knownBad[lang]?.includes(viewport.width);
          if (known) knownBug(`${card.name} card: ${card.bug}`);
          const cut = await textCutOff(page, card.match);
          expect(cut, `text cut off inside the ${card.name} card`).toEqual([]);
        });
      }

      test("the weather text does not sit on top of its sun/moon graphic", async ({ page }) => {
        const overlap = await page.evaluate(`(() => {
          ${TEXT_RECTS_JS}
          const graphic = document.querySelector('[class*="TimeCard_container"]');
          const card = graphic && graphic.closest(".clay");
          if (!graphic || !card) return ["graphic not found"];
          const g = graphic.getBoundingClientRect();
          return [...card.querySelectorAll("p")]
            .map((el) => ({ text: (el.textContent || "").trim(), r: textRect(el) }))
            .filter(({ text, r }) => text && r)
            .filter(({ r }) => r.left < g.right - 1 && g.left < r.right - 1 && r.top < g.bottom - 1 && g.top < r.bottom - 1)
            .map(({ text }) => "\\"" + text + "\\" overlaps the graphic");
        })()`);
        expect(overlap).toEqual([]);
      });

      test("the intro text neither overlaps itself nor spills out of its card", async ({ page }) => {
        // Regression: "Fix bio text overlap from misapplied line-clamp-3".
        const result = await page.evaluate(`(() => {
          ${TEXT_RECTS_JS}
          const hero = document.querySelector("article.clay");
          const card = hero.getBoundingClientRect();
          const rects = [...hero.querySelectorAll("h1, h2, p")]
            .map((el) => ({ name: el.tagName + ' "' + (el.textContent || "").trim().slice(0, 24) + '"', r: textRect(el) }))
            .filter(({ r }) => r);
          const overlaps = [];
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i].r, b = rects[j].r;
              if (a.left < b.right && b.left < a.right && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
                overlaps.push(rects[i].name + " x " + rects[j].name);
              }
            }
          }
          const spill = rects
            .map(({ name, r }) => ({ name, over: Math.max(r.bottom - card.bottom, card.top - r.top, r.right - card.right) }))
            .filter(({ over }) => over > 1)
            .map(({ name, over }) => name + " spills " + Math.round(over) + "px");
          return { overlaps, spill, count: rects.length };
        })()`) as { overlaps: string[]; spill: string[]; count: number };
        expect(result.count).toBeGreaterThan(2);
        expect(result.overlaps).toEqual([]);
        expect(result.spill).toEqual([]);
      });

      test("the tech-icon grid stays inside its box", async ({ page }) => {
        // Regression: "Fix grid busting out of its card at tablet/laptop widths".
        const grid = await bentoMetrics(page);
        expect(grid.scrollW).toBeLessThanOrEqual(grid.width + EPS);
        expect(grid.scrollH).toBeLessThanOrEqual(grid.height + EPS);
        expect(grid.right).toBeLessThanOrEqual(grid.parentRight + EPS);
      });

      test("every tech icon is drawn at the same size", async ({ page }) => {
        // Regression: "Fix inconsistent/broken tech-icon sizing in MiniBento".
        const { sizes } = await bentoMetrics(page);
        expect(new Set(sizes).size).toBe(1);
      });

      test("every tech icon fits inside its tile", async ({ page }) => {
        // Regression: "Fix mobile-tiny icon grid". On phones each tile is
        // 26px but the icon is 28px, so all thirteen are cut off.
        const { clipped, tiles } = await bentoMetrics(page);
        expect(tiles).toBeGreaterThan(0);
        expect(clipped).toEqual([]);
      });
    });
  }

  test(`${lang}: the tech icon grid keeps a square box and a whole number of rows`, async ({ page }) => {
    await open(page, path);
    const { width, height, tiles } = await bentoMetrics(page);
    expect(Math.abs(width - height)).toBeLessThanOrEqual(EPS);
    expect(tiles).toBeGreaterThan(0);
  });
}

test.describe("both languages lay out identically", () => {
  // Regression: "Fix mobile-tiny icon grid and /es page width mismatch".
  for (const viewport of VIEWPORTS) {
    test(`/ and /es/ match at ${viewport.width}px`, async ({ browser }) => {
      const measure = async (path: string) => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        await open(page, path);
        const result = await page.evaluate(() => {
          const section = document.querySelector("section")!.getBoundingClientRect();
          const cards = [...document.querySelectorAll("section > *")].map((el) => {
            const r = el.getBoundingClientRect();
            return [Math.round(r.width), Math.round(r.height)].join("x");
          });
          return { sectionWidth: Math.round(section.width), sectionLeft: Math.round(section.left), cards };
        });
        await context.close();
        return result;
      };
      const en = await measure("/");
      const es = await measure("/es/");
      expect(es.sectionWidth).toBe(en.sectionWidth);
      expect(es.sectionLeft).toBe(en.sectionLeft);
      // The same cards, in the same shape. Only the intro card's height may
      // differ, because its copy is a different length in each language.
      expect(es.cards.length).toBe(en.cards.length);
    });
  }
});

test.describe("interactive targets", () => {
  for (const viewport of [VIEWPORTS[1], VIEWPORTS[3]]) {
    test(`links and controls are big enough to tap at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page, "/");
      // WCAG 2.2 AA "target size (minimum)": 24 x 24 CSS px.
      const tooSmall = await page.evaluate(() =>
        [...document.querySelectorAll("a, button, input, [role=button]")]
          .filter((el) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).closest("label"))
          .map((el) => {
            const target = (el.tagName === "INPUT" ? el.closest("label")?.querySelector("div") ?? el : el) as HTMLElement;
            const r = target.getBoundingClientRect();
            return { name: el.getAttribute("href") ?? el.id ?? el.tagName, w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter(({ w, h }) => w > 0 && h > 0 && (w < 24 || h < 24))
          .map(({ name, w, h }) => `${name}: ${w}×${h}px`),
      );
      expect(tooSmall).toEqual([]);
    });
  }
});


/** Text inside the matching card that lies (even partly) outside the card's box. */
async function textCutOff(page: Page, match: string): Promise<string[]> {
  return page.evaluate(`(() => {
    ${TEXT_RECTS_JS}
    const re = new RegExp(${JSON.stringify(match)}, "i");
    const card = [...document.querySelectorAll(".clay")].find((el) => re.test((el.textContent ?? "").trim()));
    if (!card) return ["no card matching /${match}/"];
    const box = card.getBoundingClientRect();
    return [...card.querySelectorAll("h1, h2, h3, p")]
      .filter((el) => (el.textContent ?? "").trim())
      .map((el) => ({ text: (el.textContent ?? "").trim().slice(0, 28), r: textRect(el) }))
      .filter(({ r }) => r)
      .map(({ text, r }) => ({ text, over: Math.max(r.bottom - box.bottom, box.top - r.top, r.right - box.right, box.left - r.left) }))
      .filter(({ over }) => over > 1)
      .map(({ text, over }) => "\\"" + text + "\\" is " + Math.round(over) + "px outside the card");
  })()`);
}

interface Bento {
  width: number;
  height: number;
  scrollW: number;
  scrollH: number;
  right: number;
  parentRight: number;
  tiles: number;
  sizes: string[];
  clipped: string[];
}

async function bentoMetrics(page: Page): Promise<Bento> {
  return page.evaluate(() => {
    const grid = [...document.querySelectorAll("div")].find((d) => d.className.includes("grid-cols-4")) as HTMLElement;
    const box = grid.getBoundingClientRect();
    const parent = grid.parentElement!.getBoundingClientRect();
    const tiles = [...grid.children] as HTMLElement[];
    const sizes: string[] = [];
    const clipped: string[] = [];
    tiles.forEach((tile, index) => {
      const icon = tile.querySelector("svg, img");
      if (!icon) return;
      const t = tile.getBoundingClientRect();
      const i = icon.getBoundingClientRect();
      sizes.push(`${Math.round(i.width)}x${Math.round(i.height)}`);
      if (i.left < t.left - 0.5 || i.right > t.right + 0.5 || i.top < t.top - 0.5 || i.bottom > t.bottom + 0.5) {
        clipped.push(`tile ${index}: ${Math.round(i.width)}×${Math.round(i.height)}px icon in ${Math.round(t.width)}×${Math.round(t.height)}px tile`);
      }
    });
    return {
      width: box.width, height: box.height, scrollW: grid.scrollWidth, scrollH: grid.scrollHeight,
      right: box.right, parentRight: parent.right, tiles: tiles.length, sizes, clipped,
    };
  });
}
