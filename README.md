This is my initial build! I'll create more thorough documentation over time and update this readme as it goes!

## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Resources for help

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Thank you

Big thank you to luisadriannu(https://github.com/luisadriannu)

## Weather

The weather card needs no API key and no server:

- **Temperature and conditions** come straight from [Open-Meteo](https://open-meteo.com) (free for non-commercial use;
  weather data by Open-Meteo.com, CC BY 4.0). It is always Chicago, so visitors are never asked for their location.
- **The radar image** behind the text is from [LibreWXR](https://github.com/JoshuaKimsey/LibreWXR), a free, open-source,
  Rain Viewer-compatible radar service (AGPL-3.0, using NOAA MRMS radar data in the US), through its public instance.
  If that service is down the card simply goes without the image.

Both requests go from the visitor's browser, so nothing secret can live here: never put a key in `src/`.

## Tests

`npm test` runs the Playwright suite against a production build; `npm run test:unit` tests the weather code table and reply parsing;
`npm run test:visual` compares screenshots (`npm run test:update-visual` after an intended layout change).
