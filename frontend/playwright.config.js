/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './e2e',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:3010',
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  reporter: [['list']]
};
