/**
 * The two live widgets: Spotify presence and time/weather.
 *
 * Both fetch from third-party APIs, so every test here stubs them. The states
 * that matter are the ones the real internet produces on a bad day: no data,
 * an error, no answer at all, and unusually long text.
 */
import { expect, test } from "@playwright/test";
import { knownBug, open, setTime, stubExternal } from "./support";

const spotifyCard = (page: import("@playwright/test").Page) =>
  page.locator("article.clay").filter({ has: page.locator("svg[fill='#159F48']") });
const weatherCard = (page: import("@playwright/test").Page) =>
  page.locator("article.clay").filter({ has: page.locator('[class*="TimeCard_container"]') });

test.describe("Spotify", () => {
  test("says 'Not listening' when nothing is playing", async ({ page }) => {
    await open(page, "/", { spotify: "idle" });
    await expect(spotifyCard(page)).toContainText("Not listening");
    await expect(spotifyCard(page)).toContainText("—");
  });

  test("shows the song, artist and album art when something is playing", async ({ page }) => {
    await open(page, "/", { spotify: "listening" });
    await expect(spotifyCard(page)).toContainText("Listening now");
    await expect(spotifyCard(page)).toContainText("Midnight City");
    await expect(spotifyCard(page)).toContainText("M83");
    await expect(spotifyCard(page).locator("img")).toHaveAttribute("src", "https://cdn.test/art.png");
  });

  test("an API error reads as 'Not listening', not as a stuck spinner", async ({ page }) => {
    await open(page, "/", { spotify: "error" });
    await expect(spotifyCard(page)).toContainText("Not listening");
  });

  test("shows a loading state while the request is in flight", async ({ page }) => {
    await stubExternal(page, { spotify: "hang" });
    await page.goto("/");
    await page.locator("article.clay").first().scrollIntoViewIfNeeded();
    await expect(page.getByText("Loading..").first()).toBeVisible();
  });

  test("never stays on 'Loading..' forever when the API never answers", async ({ page }) => {
    await stubExternal(page, { spotify: "hang", weather: "ok" });
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(spotifyCard(page)).not.toContainText("Loading..", { timeout: 8000 });
  });

  test("a very long song title is truncated inside the card, not pushed out of it", async ({ page }) => {
    await open(page, "/", { spotify: "long-title" });
    const card = spotifyCard(page);
    await expect(card).toContainText("An Extraordinarily Long Song Title");
    const { over, ellipsis } = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const title = [...el.querySelectorAll("p")].find((p) => p.textContent?.startsWith("An Extraordinarily")) as HTMLElement;
      const r = title.getBoundingClientRect();
      return { over: Math.max(r.right - box.right, box.left - r.left), ellipsis: getComputedStyle(title).textOverflow };
    });
    expect(over).toBeLessThanOrEqual(1);
    expect(ellipsis).toBe("ellipsis");
  });
});

test.describe("time and weather", () => {
  test("shows temperature, conditions and city", async ({ page }) => {
    await open(page, "/", { weather: "ok" });
    const card = weatherCard(page);
    await expect(card).toContainText("71°");
    await expect(card).toContainText("Clear");
    await expect(card).toContainText("In Chicago");
  });

  for (const [iso, shown] of [
    ["2026-09-19T15:07:00", "3:07 PM"],
    ["2026-09-19T00:05:00", "12:05 AM"],
    ["2026-09-19T12:00:00", "12:00 PM"],
    ["2026-09-19T09:30:00", "9:30 AM"],
    ["2026-09-19T23:59:00", "11:59 PM"],
  ] as const) {
    test(`formats ${iso.slice(11, 16)} as ${shown}`, async ({ page }) => {
      await setTime(page, iso);
      await open(page, "/");
      await expect(weatherCard(page)).toContainText(shown);
    });
  }

  for (const [iso, phase] of [
    ["2026-09-19T07:59:00", "night"],
    ["2026-09-19T08:00:00", "day"],
    ["2026-09-19T12:00:00", "day"],
    ["2026-09-19T18:59:00", "day"],
    ["2026-09-19T19:00:00", "night"],
    ["2026-09-19T23:00:00", "night"],
  ] as const) {
    test(`at ${iso.slice(11, 16)} the card shows the ${phase} scene`, async ({ page }) => {
      await setTime(page, iso);
      await open(page, "/");
      const sun = weatherCard(page).locator('[class*="TimeCard_hot"]');
      const moon = weatherCard(page).locator('[class*="TimeCard_night"]');
      await expect(phase === "day" ? sun : moon).toHaveCount(1);
      await expect(phase === "day" ? moon : sun).toHaveCount(0);
    });
  }

  test("asks the site's own /api/weather, never OpenWeatherMap directly (the key stays on the server)", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => /\/api\/weather|openweathermap/.test(r.url()) && requests.push(r.url()));
    await open(page, "/");
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((url) => /\/api\/weather$/.test(url))).toBe(true);
  });

  test("does not ask the visitor for their location just for loading the page", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__geoAsked = 0;
      const original = navigator.geolocation?.getCurrentPosition?.bind(navigator.geolocation);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (...args) => {
          (window as any).__geoAsked++;
          return original?.(...args);
        };
      }
    });
    await open(page, "/");
    expect(await page.evaluate(() => (window as any).__geoAsked)).toBe(0);
  });

  test("a weather API error shows a sensible message, not a bare degree sign", async ({ page }) => {
    await open(page, "/", { weather: "error" });
    const bare = await weatherCard(page).locator("p").filter({ hasText: /^°$/ }).count();
    expect(bare).toBe(0);
    await expect(weatherCard(page)).toContainText("Weather unavailable");
  });

  test("never stays on 'Loading..' forever when the weather API never answers", async ({ page }) => {
    await stubExternal(page, { weather: "hang" });
    await page.goto("/");
    await expect(weatherCard(page)).not.toContainText("Loading..", { timeout: 12_000 });
  });
});
