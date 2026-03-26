import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

/**
 * All projects use Chromium for consistent cross-platform testing.
 * Device presets provide viewport, userAgent, touch, and scale settings
 * but we override the browser to Chromium since we only installed that.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    browserName: 'chromium',
  },
  projects: [
    {
      name: 'iPhone SE',
      use: {
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        userAgent: devices['iPhone SE'].userAgent,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'iPhone 14',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'Galaxy S21',
      use: {
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        deviceScaleFactor: 3,
      },
    },
    {
      name: 'iPad Mini',
      use: {
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true,
        userAgent: devices['iPad Mini'].userAgent,
        deviceScaleFactor: 2,
      },
    },
    {
      name: 'Narrow 320',
      use: {
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8080',
    cwd: '..',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
