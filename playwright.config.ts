import { defineConfig } from "@playwright/test";

// Port 3100 (not the brief's 3000): this machine runs other Next.js apps on
// 3000, so e2e uses a dedicated port to avoid colliding with them.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1280, height: 800 },
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://localhost:3100/about",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
