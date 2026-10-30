import { localIconPlugin } from "./scripts/local-icon-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
const buildId = new Date().toISOString();
export default defineConfig(({ command }) => ({
  base: "./",
  define: { __GAME_BUILD__: JSON.stringify(buildId) },
  optimizeDeps: { entries: ["index.html"] },
  plugins: [
    localIconPlugin(command),
    react(),
    { name: "game-release", generateBundle() { this.emitFile({ type: "asset", fileName: "release.json", source: JSON.stringify({ build: buildId, commit: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || "" }) }); } },
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "捡手机",
        short_name: "捡手机",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        clientsClaim: true,
        globIgnores: ["**/release.json", "**/work.json", "**/test-work.json", "**/blank-work.json"],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.endsWith("/work.json"),
          handler: "NetworkFirst",
          options: { cacheName: "game-story-content", networkTimeoutSeconds: 5, cacheableResponse: { statuses: [200] } },
        }],
        globPatterns: ["**/*.{js,css,html,svg,json,txt,png,jpg}"],
        // Inline character avatars are repeated by the existing story format.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      },
    }),
  ],
}));
