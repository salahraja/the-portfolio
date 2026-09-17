const getCoords = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });

export const getWeather = async () => {
  try {
    const appId = "23be4d8794397dd3f0ffaba6e3b678d1";
    const coords = await getCoords();

    const url = coords
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&lang=es&units=imperial&appid=${appId}`
      : `https://api.openweathermap.org/data/2.5/weather?q=Chicago&lang=es&units=imperial&appid=${appId}`;

    const res = await fetch(url);
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
