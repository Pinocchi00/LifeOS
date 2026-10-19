import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash, X509Certificate } from "node:crypto";
const fixtureKey = new X509Certificate(
  readFileSync(
    new URL("./server/test-fixtures/tls/fixture-cert.pem", import.meta.url),
  ),
).publicKey;
const fixtureSpki = createHash("sha256")
  .update(fixtureKey.export({ type: "spki", format: "der" }))
  .digest("base64");
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: {
      args: [`--ignore-certificate-errors-spki-list=${fixtureSpki}`],
    },
  },
  webServer: [
    {
      command: "npm run preview -- --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node scripts/connector-fixture.mjs",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node scripts/ai-fixture.mjs",
      url: "http://127.0.0.1:4176",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node scripts/https-fixture.mjs",
      url: "https://127.0.0.1:4180",
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
});
