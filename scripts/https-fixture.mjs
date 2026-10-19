// Isolated browser TLS fixture: synthetic keys/data, loopback only, no real API.
import { fileURLToPath } from "node:url";
import { connectorConfig, createConnector } from "../server/connector.mjs";
const servers = [];
for (const port of [4180, 4181]) {
  const config = connectorConfig({
    LIFEOS_REMOTE_ORIGIN: `https://127.0.0.1:${port}`,
    LIFEOS_TLS_CERT_FILE: fileURLToPath(
      new URL("../server/test-fixtures/tls/fixture-cert.pem", import.meta.url),
    ),
    LIFEOS_TLS_KEY_FILE: fileURLToPath(
      new URL("../server/test-fixtures/tls/fixture-key.pem", import.meta.url),
    ),
    LIFEOS_GITHUB_TOKEN: "https-browser-fixture-github-token",
    LIFEOS_GITHUB_REPOSITORIES: "example/private",
    LIFEOS_OPENAI_KEY: "https-browser-fixture-openai-key",
    LIFEOS_AI_DAILY_USD: "0.20",
    LIFEOS_AI_DAILY_CALLS: "2",
  });
  const { server } = await createConnector({
    config,
    distRoot: fileURLToPath(new URL("../dist", import.meta.url)),
    ledgerPath: ":memory:",
    code: "https-browser-fixture-code",
    now: () => Date.parse("2026-10-19T22:00:00Z"),
    upstream: async (url) => {
      if (url.endsWith("/input_tokens"))
        return Response.json({
          object: "response.input_tokens",
          input_tokens: 160,
        });
      if (url === "https://api.openai.com/v1/responses")
        return Response.json({
          id: "resp_https_browser_fixture",
          object: "response",
          model: "gpt-5.6-terra",
          status: "completed",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: "Proposition HTTPS fictive, aucune action exécutée.",
                },
              ],
            },
          ],
          usage: { input_tokens: 160, output_tokens: 90 },
        });
      if (url !== "https://api.github.com/repos/example/private/pulls/42")
        throw new Error("Unexpected fixture URL");
      return Response.json({
        html_url: "https://github.com/example/private/pull/42",
        number: 42,
        title: "Référence privée HTTPS fictive",
        state: "closed",
        merged: true,
        draft: false,
        head: { sha: "a".repeat(40) },
        updated_at: "2026-10-19T12:00:00Z",
      });
    },
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  servers.push(server);
}
const stop = () =>
  servers.forEach((server) => {
    server.closeAllConnections();
    server.close();
  });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
