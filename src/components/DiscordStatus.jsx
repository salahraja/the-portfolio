import { useState, useEffect } from "preact/hooks";
import { getInfo } from "../services/getInfo";

export const DiscordStatus = () => {
  const [activityData, setActivityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const userLanguage = document.documentElement.getAttribute("lang");
    setLanguage(userLanguage);
  }, []);

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

    const interval = setInterval(fetchData, 600000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <article class="flex flex-col justify-center items-center rounded-2xl relative col-span-1 md:col-span-1 p-4 text-center aspect-square bg-[#f96568] text-white border-2 dark:border-[#30363D] dark:bg-[#3730A3] transition duration-300 delay-75 ease-in-out">
        <div class="flex gap-1 md:gap-2 justify-center items-center text-md md:text-2xl xl:text-3xl font-bold">
          <div>
            <p class="text-sm lg:text-2xl">
              {language === "en" ? "Loading.." : "Cargando.."}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      class={`bg-[#5765F2] dark:bg-[#3730A3] flex flex-col justify-center items-center rounded-2xl relative col-span-1 md:col-span-1 p-4 text-center aspect-square text-white border-2 dark:border-[#30363D] transition duration-300 delay-75 ease-in-out`}
    >
      <div class="flex gap-1 md:gap-2 justify-center items-center text-md md:text-2xl xl:text-3xl font-bold">
        <div>
          <div class="absolute top-2 right-2 bg-white rounded-full p-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-black"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M17 7l-10 10"></path>
              <path d="M8 7l9 0l0 9"></path>
            </svg>
          </div>
          <p class="text-sm md:text-2xl lg:text-3xl">My Projects</p>
        </div>
      </div>
    </article>
  );
};
