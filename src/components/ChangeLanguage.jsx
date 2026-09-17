export const ChangeLanguage = () => {
  return (
    <a style={{ "--clay-tint": "85, 166, 48" }} class="clay col-span-1 flex flex-col items-center justify-center rounded-2xl aspect-square bg-[#55a630] text-white w-full p-4 dark:bg-[#0D1116] transition duration-300 delay-75 ease-in-out cursor-pointer">
      <p class="font-semibold uppercase text-5xl md:text-8xl">EN</p>
      <p class="font-bold transition duration-300 ease-in-out  flex gap-1">
        <span>EN</span>
        <span>ES</span>
      </p>
    </a>
  );
};
