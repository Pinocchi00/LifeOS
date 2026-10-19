import { fileURLToPath } from "node:url";
try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 24 || (major === 24 && minor < 12))
    throw new Error("Le serveur privé requiert Node.js 24.12 ou plus récent.");
  const { connectorConfig, createConnector } =
    await import("../server/connector.mjs");
  const config = connectorConfig(process.env);
  const { server, code } = await createConnector({
    config,
    distRoot: fileURLToPath(new URL("../dist", import.meta.url)),
  });
  server.on("error", () => {
    console.error("Serveur indisponible : vérifiez le port local.");
    process.exitCode = 1;
  });
  server.listen(config.port, "127.0.0.1", () => {
    console.log(`LifeOS : http://127.0.0.1:${config.port}`);
    console.log(
      config.token || config.ai
        ? `Code d’appairage local (10 min, usage unique) : ${code}`
        : "Connecteurs désactivés : configurez les accès facultatifs côté serveur.",
    );
    console.log(
      "Arrêt : Ctrl+C. Le jeton fournisseur ne quitte pas ce processus.",
    );
  });
  const stop = () => {
    server.closeAllConnections();
    server.close();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
