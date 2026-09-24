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
    // SwiftShader: headless Chromium has no GPU, а без WebGL атлас не грузится
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    {
      // прежний прогон: широкое окно, мобильный спек сюда не попадает
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } },
      testIgnore: /mobile\.spec/,
    },
    {
      // телефон (iPhone 12-ish): тач и `isMobile` включают мобильную раскладку
      // по-настоящему — meta viewport, тач-события, отсутствие hover
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
      },
      testMatch: /mobile\.spec/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev --port 3100",
        url: "http://localhost:3100/about",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
