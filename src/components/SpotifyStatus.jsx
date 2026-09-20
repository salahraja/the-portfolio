import { useState, useEffect } from "preact/hooks";
import { getInfo } from "../services/getInfo";

const OFFLINE_ART = "/assets/spotify-offline.jpeg";

export const SpotifyStatus = ({ lang = "en" }) => {
  const [activityData, setActivityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const language = lang;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getInfo();
        setActivityData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error al obtener datos:", err);
        setIsLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 300000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <>
        <p class="text-[#ffffff] font-bold text-xs lg:text-2xl md:text-xl">
          {language === "en" ? "Loading.." : "Cargando.."}
        </p>
        <img
          loading="lazy"
          class="absolute w-full h-full top-0 left-0 object-center object-cover z-[-1]"
          src="/assets/spotify-offline.jpeg"
          alt="Spotify Album"
        ></img>
      </>
    );
  }

  const spotify = activityData?.data?.spotify ?? null;

  return (
    <div class="flex flex-col gap-4">
      <div>
        <p class="text-[#ffffff] font-bold text-xs lg:text-2xl md:text-xl">
          {spotify === null
            ? language === "en"
              ? "Not listening"
              : "No está escuchando"
            : language === "en"
            ? "Listening now"
            : "Escuchando ahora"}
        </p>
        <div class="flex flex-col gap-1">
          <p class="text-[#ffffff] w-full xl:text-xl lg:text-lg text-xs font-semibold truncate">
            {spotify === null ? "—" : spotify.song}
          </p>
          <p class="text-[#ffffff] w-full xl:text-xl lg:text-lg text-xs truncate">
            {spotify === null ? "" : spotify.artist}
          </p>
        </div>
      </div>
      <img
        loading="lazy"
        class="absolute w-full h-full top-0 left-0 object-center object-cover z-[-1]"
        src={spotify === null ? OFFLINE_ART : spotify.album_art_url}
        // An album-art link from Spotify can expire; show the offline art instead of a broken image.
        onError={(event) => {
          if (!event.currentTarget.src.endsWith(OFFLINE_ART)) event.currentTarget.src = OFFLINE_ART;
        }}
        alt="Spotify Album"
      ></img>
    </div>
  );
};
