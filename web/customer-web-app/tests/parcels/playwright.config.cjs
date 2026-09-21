module.exports = {
  testDir: ".",
  testMatch: "*.e2e.cjs",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  outputDir: "../../test-results/parcels",
  use: {
    baseURL: process.env.PARCEL_TEST_URL || "http://localhost:3107",
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: process.env.PARCEL_BROWSER_EXECUTABLE
      ? { executablePath: process.env.PARCEL_BROWSER_EXECUTABLE }
      : {},
  },
};
