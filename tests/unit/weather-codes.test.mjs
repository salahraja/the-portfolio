// The WMO weather-code table behind the weather card, and how the Open-Meteo reply is read.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { describeWeather, getWeather } from "../../src/services/getWeather.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const reply = (status, body) => {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
};

test("known codes read in English and Spanish", () => {
  assert.deepEqual(describeWeather(0), ["Clear", "cielo despejado"]);
  assert.deepEqual(describeWeather(63), ["Rain", "lluvia"]);
  assert.deepEqual(describeWeather(95), ["Thunderstorm", "tormenta"]);
  assert.deepEqual(describeWeather(73), ["Snow", "nieve"]);
});

test("an unknown code is 'Unknown', not a crash", () => {
  assert.deepEqual(describeWeather(1234), ["Unknown", "desconocido"]);
  assert.deepEqual(describeWeather(undefined), ["Unknown", "desconocido"]);
});

test("a good reply becomes a rounded temperature, conditions and Chicago", async () => {
  reply(200, { current: { temperature_2m: 71.6, weather_code: 3 } });
  assert.deepEqual(await getWeather(), { temp: 72, weather: "Overcast", weatherEs: "nublado", city: "Chicago" });
});

test("a temperature of exactly 0 is a real reading, not a missing one", async () => {
  reply(200, { current: { temperature_2m: 0, weather_code: 0 } });
  assert.equal((await getWeather()).temp, 0);
});

test("an error status or a reply without a temperature is an error", async () => {
  reply(500, { reason: "x" });
  await assert.rejects(getWeather());
  reply(200, { current: {} });
  await assert.rejects(getWeather());
  reply(200, {});
  await assert.rejects(getWeather());
});

test("asks Open-Meteo for Chicago in Fahrenheit and sends no key", async () => {
  let asked;
  globalThis.fetch = async (url) => {
    asked = new URL(String(url));
    return new Response(JSON.stringify({ current: { temperature_2m: 50, weather_code: 0 } }));
  };
  await getWeather();
  assert.equal(asked.hostname, "api.open-meteo.com");
  assert.equal(asked.searchParams.get("temperature_unit"), "fahrenheit");
  assert.ok(![...asked.searchParams.keys()].some((k) => /key|appid|token/i.test(k)));
});
