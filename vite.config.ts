import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "title-bootstrap",
              test:
                /src\/(?:main|ui\/(?:app-chrome-render|background-music-catalog|background-music-controller|bootstrap|bootstrap-render|focus-management|home-render|html|music-preference|music-preference-state|save-presentation)|game\/(?:character|random|persistence\/(?:save-metadata|schema)))\.ts$/,
            },
            {
              name: "playable-runtime",
              test: /src\/(?:game\/engine|ui\/app)\.ts$/,
            },
          ],
        },
      },
    },
  },
});
