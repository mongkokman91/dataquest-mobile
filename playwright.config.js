const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [['list']],
  webServer: {
    command: 'node tests/server.js',
    url: 'http://127.0.0.1:4173/fixture.html',
    reuseExistingServer: true
  },
  use: { locale: 'en-CA', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'android-chromium',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 604 }, deviceScaleFactor: 3 }
    },
    {
      name: 'desktop-edge-chromium',
      use: { browserName: 'chromium', viewport: { width: 1900, height: 1120 } }
    }
  ]
});
