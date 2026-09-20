import { useState, useEffect } from "preact/hooks";
import { getWeather } from "../services/getWeather";
import "./Styles.css";

// Live precipitation radar centred on Chicago, from LibreWXR (https://github.com/JoshuaKimsey/LibreWXR),
// a free, open-source Rain Viewer-compatible service. Timestamp 0 means "the latest frame". The tile is
// transparent where nothing is falling, so on a dry day the card looks the same as before.
const RADAR_URL = "https://api.librewxr.net/v2/radar/0/256/6/41.88/-87.63/2/1_1.png";

function Radar({ language }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src={RADAR_URL}
      loading="lazy"
      width="256"
      height="256"
      alt={language === "en" ? "Live rain radar around Chicago" : "Radar de lluvia en vivo alrededor de Chicago"}
      class="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none z-0"
      // If the radar service is down, the card just goes without it.
      onError={() => setOk(false)}
    />
  );
}

function ShowTime({ lang = "en" }) {
  const [currentHours, setCurrentHours] = useState(getCurrentHours());
  const [hourConditional, setHourConditional] = useState(getHoursConditional());
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const language = lang;

  // CLIMA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getWeather();
        setWeather(data);
        setFailed(false);
        setIsLoading(false);
      } catch (err) {
        console.error("Error al obtener datos:", err);
        setFailed(true);
        setIsLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 10800000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // HORAS
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHours(getCurrentHours());
      setHourConditional(getHoursConditional());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  function getCurrentHours() {
    let timeNow = new Date();
    let hours = timeNow.getHours();
    let minutes = timeNow.getMinutes();
    let ampm = "AM";

    if (hours >= 12) {
      ampm = "PM";
      if (hours > 12) {
        hours -= 12;
      }
    }

    if (hours === 0) {
      hours = 12;
    }

    minutes = minutes.toString().padStart(2, "0");

    return `${hours}:${minutes} ${ampm}`;
  }

  function getHoursConditional() {
    return new Date().getHours();
  }

  if (isLoading) {
    return (
      <div class="bg-[#089cffa4] relative w-full h-full flex overflow-hidden bg-clip-padding text-white py-2 px-4 lg:p-8">
        <div class="flex flex-col justify-center lg:justify-start lg:h-full w-2/3 absolute lg:static z-10">
          <p class="text-white capitalize text-xs md:text-xl lg:text-2xl font-semibold lg:mb-0">
            {language === "en" ? "Loading.." : "Cargando.."}
          </p>
        </div>
        <div class="absolute right-0 top-0 flex z-0 items-center lg:items-end lg:pb-4 w-full h-full overflow-hidden justify-end">
          <div class="TimeCard_hot__Br_X1 TimeCard_container__bLNa3 w-16 h-16 md:w-14 md:h-14 lg:w-16 lg:h-16 right-5 md:right-2 lg:right-4">
            <span class="TimeCard_sun___9W9H w-8 h-8 md:w-7 md:h-7 lg:w-8 lg:h-8"></span>
            <span class="TimeCard_sunx__Dp1CZ"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      class={`${
        hourConditional >= 8 && hourConditional <= 18
          ? "bg-[#089cffa4]"
          : "bg-[#001324]"
      } relative w-full h-full flex overflow-hidden bg-clip-padding text-white py-2 px-4 lg:p-4`}
    >
      <Radar language={language} />
      <div class="flex flex-col justify-center lg:justify-start lg:h-full w-2/3 lg:w-full absolute lg:static z-10">
        <div>
          {weather ? (
            <>
              <p class="text-lg md:text-5xl lg:text-5xl font-bold">
                {weather.temp}°
              </p>
              <p class="capitalize text-xs md:text-base lg:text-lg font-semibold lg:mb-0">
                {language === "en" ? weather.weather : weather.weatherEs}
              </p>
            </>
          ) : (
            <p class="text-xs md:text-xl lg:text-2xl font-semibold lg:mb-0">
              {language === "en" ? "Weather unavailable" : "Clima no disponible"}
            </p>
          )}
          <p class="text-xs md:text-md lg:text-lg">{currentHours}</p>
          <p class="text-xs md:text-md lg:text-lg">
            {weather?.city
              ? language === "en"
                ? `In ${weather.city}`
                : `En ${weather.city}`
              : ""}
          </p>
        </div>
      </div>

      {hourConditional >= 8 && hourConditional <= 18 ? (
        <div class="absolute right-0 top-0 flex z-0 items-center lg:items-end lg:pb-4 w-full h-full overflow-hidden justify-end">
          <div class="TimeCard_hot__Br_X1 TimeCard_container__bLNa3 w-16 h-16 md:w-14 md:h-14 lg:w-16 lg:h-16 right-5 md:right-2 lg:right-4">
            <span class="TimeCard_sun___9W9H w-8 h-8 md:w-7 md:h-7 lg:w-8 lg:h-8"></span>
            <span class="TimeCard_sunx__Dp1CZ"></span>
          </div>
        </div>
      ) : (
        <div class="absolute right-0 top-0 flex justify-end z-0 items-center lg:items-end lg:pb-4 w-full h-full overflow-hidden">
          <div class="TimeCard_night__BfZ0q TimeCard_container__bLNa3 w-16 h-16 md:w-14 md:h-14 lg:w-16 lg:h-16 right-5 md:right-2 lg:right-4">
            <span class="TimeCard_moon__scQu9 w-8 h-8 md:w-7 md:h-7 lg:w-8 lg:h-8"></span>
            <span class="TimeCard_spot1__SaOIN"></span>
            <span class="TimeCard_spot2__Cq_4z"></span>
            <ul>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShowTime;
