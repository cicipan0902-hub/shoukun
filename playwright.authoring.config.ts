import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: ["authoring.spec.ts"],
  timeout: 30000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4185",
    channel: "chrome",
    headless: true,
    serviceWorkers: "block",
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --config vite.runtime.config.ts --host 127.0.0.1 --port 4185 --strictPort",
    url: "http://127.0.0.1:4185",
    reuseExistingServer: true,
  },
});
