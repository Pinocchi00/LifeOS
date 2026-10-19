// Browser-test fixture only. Never loads user credentials or contacts GitHub.
import { fileURLToPath } from "node:url";
import { connectorConfig, createConnector } from "../server/connector.mjs";
const servers = [];
for (const port of [4174, 4175]) {
  const config = connectorConfig({
    LIFEOS_GITHUB_TOKEN: "fixture-provider-credential-only-for-browser-tests",
    LIFEOS_GITHUB_REPOSITORIES: "example/private",
    LIFEOS_CONNECTOR_PORT: String(port),
  });
  const { server } = await createConnector({
    config,
    code: "fixture-browser-code",
    distRoot: fileURLToPath(new URL("../dist", import.meta.url)),
    upstream: async (url) => {
      if (url !== "https://api.github.com/repos/example/private/pulls/42")
        throw new Error("Unexpected fixture URL");
      return Response.json({
        html_url: "https://github.com/example/private/pull/42",
        number: 42,
        title: "Réponse privée fictive <img src=x onerror=alert(1)>",
        state: "closed",
        merged: true,
        draft: false,
        head: { sha: "a".repeat(40) },
        updated_at: "2026-10-19T12:00:00Z",
        body: "EXCLUDED-BROWSER-BODY",
      });
    },
  });
  server.listen(config.port, "127.0.0.1");
  servers.push(server);
}
const stop = () => {
  for (const server of servers) {
    server.closeAllConnections();
    server.close();
  }
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
