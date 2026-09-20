// The weather proxy: what it sends upstream, and that a failure is a plain status, not a crash.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import handler, { config } from "../../netlify/functions/weather.mjs";

const realFetch = globalThis.fetch;
const realKey = process.env.OPENWEATHER_API_KEY;
let calls;

beforeEach(() => {
  calls = [];
  process.env.OPENWEATHER_API_KEY = "test-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.OPENWEATHER_API_KEY;
  else process.env.OPENWEATHER_API_KEY = realKey;
});

const upstream = (status, body) => {
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  };
};

test("is served at /api/weather", () => {
  assert.equal(config.path, "/api/weather");
});

test("passes the weather through and asks for Chicago with the server's key", async () => {
  upstream(200, { main: { temp: 71.4 }, weather: [{ main: "Clear", description: "cielo claro" }], name: "Chicago" });
  const res = await handler();
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, "Chicago");
  const url = new URL(calls[0]);
  assert.equal(url.hostname, "api.openweathermap.org");
  assert.equal(url.searchParams.get("q"), "Chicago");
  assert.equal(url.searchParams.get("appid"), "test-key");
  assert.match(res.headers.get("cache-control"), /max-age=600/);
});

test("with no key configured it is a 503 and calls nothing", async () => {
  delete process.env.OPENWEATHER_API_KEY;
  upstream(200, {});
  const res = await handler();
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test("an upstream error is a 502 that does not repeat the upstream's body", async () => {
  upstream(401, { cod: 401, message: "Invalid API key. appid=test-key" });
  const res = await handler();
  assert.equal(res.status, 502);
  assert.doesNotMatch(await res.text(), /test-key/);
});

test("a request that fails or times out is a 504", async () => {
  globalThis.fetch = async () => {
    throw new DOMException("timed out", "TimeoutError");
  };
  assert.equal((await handler()).status, 504);
});

test("the key never appears in a successful response either", async () => {
  upstream(200, { main: { temp: 1 }, weather: [{ main: "x", description: "y" }], name: "Chicago" });
  assert.doesNotMatch(await (await handler()).text(), /test-key/);
});
