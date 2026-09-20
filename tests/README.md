# Tests

End-to-end tests with [Playwright](https://playwright.dev), run against the
**production build** (what actually ships), in a real Chromium. There is no unit
layer: this site is a page of cards, and its bugs are visual.

```bash
npm test                     # everything except visual snapshots (~30 s)
npm run test:visual          # visual snapshots
npm run test:update-visual   # accept new snapshots after an intentional change
npm run test:report          # open the HTML report of the last run
PORTFOLIO_URL=https://… npm test    # test the deployed site instead
REUSE_SERVER=1 npm test      # skip the rebuild while iterating on a test
```

`npm test` builds the site and serves it on port 4322 itself. It does not reuse a
running server unless `REUSE_SERVER=1`, so it can never test a stale build.

## What is covered

| File | Guards against |
|---|---|
| `layout.spec.ts` | Sideways scrolling, cards escaping the viewport or overlapping, text cut off inside a card, intro text overlapping (the `line-clamp` bug), the tech-icon grid busting out, inconsistent or clipped icons, `/` and `/es/` drifting apart. Every check runs at 320, 375, 414, 768, 1024, 1280 and 1440 px on both pages. |
| `images.spec.ts` | Broken or hidden images (the "invisible background" bug), missing alt text, 404s and console errors, a 1 MB page-weight budget. |
| `i18n.spec.ts` | Wrong-language copy, EN/ES card parity, the language switch, widgets following `<html lang>`. |
| `theme.spec.ts` | Dark mode toggling, persisting across reloads and pages, keyboard use, accessible name. |
| `widgets.spec.ts` | Spotify and weather/time in every state: idle, playing, error, hung, long titles, clock formatting (12 AM/PM edges), day/night boundaries. |
| `links-seo.spec.ts` | Link safety, the résumé PDF, heading structure, meta tags, and API keys shipped in client JS. |
| `a11y.spec.ts` | axe-core (WCAG 2.2 AA) on both pages, both themes, phone and laptop. |
| `visual.spec.ts` | Full-page and icon-grid snapshots. |

Both live APIs (Lanyard and OpenWeatherMap) are stubbed in `support.ts`, and the
clock is frozen where time matters, so nothing depends on the internet or the hour.

## Known bugs

Some tests describe a bug that exists today. They are marked with `knownBug(...)`
(`test.fail`), so the suite is green while the bug is open, and **the day it is
fixed Playwright reports "Expected to fail, but passed"** — delete the marker.
`grep -rn "knownBug" tests/e2e` lists them. Accessibility issues are tracked in
the `KNOWN` table in `a11y.spec.ts` instead: a violation *not* in that table
fails the suite.

## Visual snapshots

Baselines are stored per platform (`…-chromium-darwin.png`). They record how the
page looks today, known bugs included; when a bug is fixed, the diff is the fix —
review it, then `npm run test:update-visual`. CI runs on Linux and excludes them
until Linux baselines are generated.
