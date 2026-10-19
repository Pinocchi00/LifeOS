// Browser fixture only: no user key, file persistence, or real provider request.
import { fileURLToPath } from "node:url";
import { connectorConfig, createConnector } from "../server/connector.mjs";
import { aiCatalog } from "../src/domain/ai.ts";
const servers = [];
for (const port of [4176, 4177]) {
  const config = connectorConfig({
    LIFEOS_OPENAI_KEY: "fixture-only-openai-key-not-real",
    LIFEOS_AI_DAILY_USD: "0.20",
    LIFEOS_AI_DAILY_CALLS: "2",
  });
  const { server } = await createConnector({
    config,
    code: "fixture-ai-browser-code",
    ledgerPath: ":memory:",
    distRoot: fileURLToPath(new URL("../dist", import.meta.url)),
    now: () => Date.parse("2026-10-19T12:00:00Z"),
    upstream: async (url) => {
      if (url === "https://api.openai.com/v1/responses/input_tokens")
        return Response.json({
          object: "response.input_tokens",
          input_tokens: 250,
        });
      if (url !== "https://api.openai.com/v1/responses")
        throw new Error("Unexpected fixture URL");
      return Response.json({
        id: "resp_browser_fixture",
        object: "response",
        model: aiCatalog.model,
        status: "incomplete",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: "Proposition fictive <img src=x onerror=alert(1)> : vérifier les critères. Aucun test exécuté.",
              },
            ],
          },
        ],
        usage: { input_tokens: 250, output_tokens: 120 },
      });
    },
  });
  server.listen(port, "127.0.0.1");
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
