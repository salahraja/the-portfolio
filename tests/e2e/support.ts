import { expect, test, type Page, type Route } from "@playwright/test";

export const PAGES = [
  { path: "/", lang: "en" },
  { path: "/es/", lang: "es" },
] as const;

// Phone sizes through large desktop. 768 and 1024 straddle the md/lg
// breakpoints, where most of this site's layout bugs have lived.
export const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

export const LANYARD = /api\.lanyard\.rest/;
export const WEATHER = /\/api\/weather/;

type Spotify = "idle" | "listening" | "error" | "hang" | "long-title" | "bad-art";
type Weather = "ok" | "error" | "hang";

export interface Stubs {
  spotify?: Spotify;
  weather?: Weather;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

// A 1x1 transparent PNG, so album art "loads" without touching the network.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Replace the two live APIs the page calls (Discord/Spotify presence and
 * weather) with fixed responses. A UI test that depends on whatever Salah is
 * listening to, or the weather in Chicago, tells you about neither.
 */
export async function stubExternal(page: Page, stubs: Stubs = {}) {
  const spotify = stubs.spotify ?? "idle";
  const weather = stubs.weather ?? "ok";

  await page.route(LANYARD, (route) => {
    if (spotify === "error") return json(route, {}, 500);
    if (spotify === "hang") return; // never answers
    const track = {
      song: spotify === "long-title"
        ? "An Extraordinarily Long Song Title That Goes On And On And Never Seems To End Anywhere"
        : "Midnight City",
      artist: spotify === "long-title"
        ? "The Band With A Truly Enormous Name That Also Refuses To Stop"
        : "M83",
      album_art_url: spotify === "bad-art" ? "https://cdn.test/expired-art.jpg" : "https://cdn.test/art.png",
    };
    return json(route, { data: { spotify: spotify === "idle" ? null : track } });
  });

  await page.route("https://cdn.test/art.png", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
  await page.route("https://cdn.test/expired-art.jpg", (route) => route.fulfill({ status: 404 }));

  await page.route(WEATHER, (route) => {
    if (weather === "error") return json(route, { message: "server error" }, 500);
    if (weather === "hang") return;
    return json(route, {
      main: { temp: 71.4 },
      weather: [{ main: "Clear", description: "cielo claro" }],
      name: "Chicago",
    });
  });
}

/** Load a page with both APIs stubbed and wait for the widgets to settle. */
export async function open(page: Page, path: string, stubs: Stubs = {}) {
  await stubExternal(page, stubs);
  await page.goto(path);
  await settle(page);
}

/**
 * Widgets are `client:visible`/`client:load` islands: they hydrate, then fetch.
 * Scroll everything into view, then wait until neither is still "Loading..".
 */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    window.scrollTo(0, 0);
  });
  await expect(page.getByText(/^(Loading\.\.|Cargando\.\.)$/)).toHaveCount(0, { timeout: 10_000 });
}

/** Freeze "now" (local time) without stopping timers. */
export async function setTime(page: Page, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
}

/**
 * Mark a test as a known, currently-failing bug. It still runs: while the bug
 * exists the test is expected to fail (so the suite stays green and the bug
 * stays visible); the day it is fixed, Playwright reports "expected to fail
 * but passed", and the marker gets deleted.
 */
export function knownBug(description: string) {
  test.fail(true, `KNOWN BUG: ${description}`);
}
