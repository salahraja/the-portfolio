// Current conditions for Chicago from Open-Meteo (https://open-meteo.com): free for non-commercial
// use and needs no API key, so nothing secret is sent to visitors and no server is involved.
// It is always Chicago: the card is about where the site's owner is, and asking every visitor for
// their location just to load a page triggers a browser permission prompt.
const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298" +
  "&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FChicago";

// WMO weather codes, as Open-Meteo reports them: [English, Spanish].
const CODES = [
  [[0], ["Clear", "cielo despejado"]],
  [[1], ["Mostly clear", "mayormente despejado"]],
  [[2], ["Partly cloudy", "parcialmente nublado"]],
  [[3], ["Overcast", "nublado"]],
  [[45, 48], ["Fog", "niebla"]],
  [[51, 53, 55], ["Drizzle", "llovizna"]],
  [[56, 57], ["Freezing drizzle", "llovizna helada"]],
  [[61, 63, 65], ["Rain", "lluvia"]],
  [[66, 67], ["Freezing rain", "lluvia helada"]],
  [[71, 73, 75, 77], ["Snow", "nieve"]],
  [[80, 81, 82], ["Rain showers", "chubascos"]],
  [[85, 86], ["Snow showers", "chubascos de nieve"]],
  [[95, 96, 99], ["Thunderstorm", "tormenta"]],
];

export const describeWeather = (code) => {
  const found = CODES.find(([codes]) => codes.includes(code));
  return found ? found[1] : ["Unknown", "desconocido"];
};

export const getWeather = async () => {
  try {
    // A request that never answers must not leave the card on "Loading.." forever.
    const res = await fetch(URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw { status: res.status, statusText: res.statusText };
    }

    const json = await res.json();
    const current = json && json.current;

    if (current && typeof current.temperature_2m === "number") {
      const [weather, weatherEs] = describeWeather(current.weather_code);
      return { temp: Math.round(current.temperature_2m), weather, weatherEs, city: "Chicago" };
    }
    throw new Error("No se encontró la temperatura en la respuesta JSON.");
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
