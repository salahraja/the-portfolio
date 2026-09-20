// Weather comes from our own /api/weather (a Netlify function), which holds the API key.
// It is always Chicago: the card is about where the site's owner is, and asking every visitor
// for their location just to load a page triggers a browser permission prompt.
export const getWeather = async () => {
  try {
    // A request that never answers must not leave the card on "Loading.." forever.
    const res = await fetch("/api/weather", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw { status: res.status, statusText: res.statusText };
    }

    const json = await res.json();

    if (json && json.main && json.main.temp) {
      let temp = Math.round(json.main.temp),
        weather = json.weather[0].main,
        weatherEs = json.weather[0].description,
        city = json.name;

      return { temp, weather, weatherEs, city };
    } else {
      throw new Error(
        "No se encontró la propiedad 'temp' en la respuesta JSON."
      );
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
