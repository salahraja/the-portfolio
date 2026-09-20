// A small proxy for OpenWeatherMap, so the API key lives in a Netlify environment variable
// (OPENWEATHER_API_KEY) and never ships to a visitor's browser.
//
// GET /api/weather   -> the current weather for Chicago, as OpenWeatherMap returns it.
// Anything wrong (no key configured, upstream error, timeout) is a plain error status, which the
// page shows as "Weather unavailable" rather than a broken card.

export default async () => {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return json({ message: "weather is not configured" }, 503);
  }

  const upstream = new URL("https://api.openweathermap.org/data/2.5/weather");
  upstream.search = new URLSearchParams({
    q: "Chicago",
    lang: "es",
    units: "imperial",
    appid: key,
  }).toString();

  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(6000) });
    const body = await res.text();
    return new Response(res.ok ? body : JSON.stringify({ message: "weather service error" }), {
      status: res.ok ? 200 : 502,
      headers: {
        "content-type": "application/json",
        // Weather changes slowly; ten minutes keeps visitors from each spending an API call.
        "cache-control": "public, max-age=600",
      },
    });
  } catch {
    return json({ message: "weather service did not answer" }, 504);
  }
};

export const config = { path: "/api/weather" };

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
