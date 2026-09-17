import { useState, useEffect } from "preact/hooks";

export const DiscordStatus = () => {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const userLanguage = document.documentElement.getAttribute("lang");
    setLanguage(userLanguage);
  }, []);

  return (
    <article
      style={{ "--clay-tint": "87, 101, 242" }}
      class={`clay bg-[#5765F2] dark:bg-[#3730A3] flex flex-col justify-center items-center rounded-2xl relative col-span-1 md:col-span-1 p-4 text-center aspect-square text-white transition duration-300 delay-75 ease-in-out`}
    >
      <div class="flex gap-1 md:gap-2 justify-center items-center text-md md:text-2xl xl:text-3xl font-bold">
        <div>
          <p class="text-sm md:text-2xl lg:text-3xl">
            {language === "en" ? "My Projects" : "Mis Proyectos"}
          </p>
        </div>
      </div>
    </article>
  );
};
