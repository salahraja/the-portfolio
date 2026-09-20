import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Test the deployed site instead of a local build:
//   PORTFOLIO_URL=https://your-site.netlify.app npm test
const remote = process.env.PORTFOLIO_URL;
const PORT = 4322;

// Which Chromium to drive. Brave is used when it is installed; BROWSER_PATH points at any other
// Chromium-based browser, and BROWSER_PATH=playwright uses the Chromium Playwright downloads itself.
const BRAVE = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const chosen = process.env.BROWSER_PATH;
const executablePath =
  chosen === "playwright" ? undefined : chosen ?? (existsSync(BRAVE) ? BRAVE : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  // Layout bugs are viewport-dependent, so each test loads its own page and
  // picks its own size; nothing shares state between tests.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  // Baselines are per platform ({name}-{project}-{platform}.png) because font
  // rendering differs between macOS and Linux; see tests/README.md.
  snapshotPathTemplate: "tests/e2e/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}",
  use: {
    baseURL: remote ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Browsers ask permission for location; a test that reaches that prompt
    // would hang. Location behaviour is tested explicitly with a stub.
    permissions: [],
    launchOptions: { executablePath },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build (what actually ships), not the
  // dev server, whose CSS and hydration differ.
  webServer: remote
    ? undefined
    : {
        command: `npm run build && npx astro preview --port ${PORT} --host 127.0.0.1`,
        url: `http://127.0.0.1:${PORT}`,
        // Off by default: a preview server left running from earlier would be
        // serving a stale build, and the tests would quietly check old code.
        // Set REUSE_SERVER=1 to skip the rebuild while iterating on a test.
        reuseExistingServer: !!process.env.REUSE_SERVER,
        timeout: 180_000,
      },
});
