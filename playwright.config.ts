import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test/e2e",
  timeout: 60000,
  use: {
    baseURL: process.env.VITE_APP_URL || "http://127.0.0.1:8080",
    trace: "retain-on-failure",
  },
});
