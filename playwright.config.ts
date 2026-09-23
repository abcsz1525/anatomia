import { defineConfig } from "@playwright/test";

// Port 3100 (not the brief's 3000): this machine runs other Next.js apps on
// 3000, so e2e uses a dedicated port to avoid colliding with them.
// PLAYWRIGHT_BASE_URL overrides this (e.g. to point at an already-running
// dev server on another port); when set, we skip spawning our own webServer
// since Next.js refuses a second `next dev` for the same project directory.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev --port 3100",
        url: "http://localhost:3100/about",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
