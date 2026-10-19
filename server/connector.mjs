import { StringDecoder } from "node:string_decoder";
import { aiConfig, createAi } from "./ai.mjs";
import { createServer } from "node:http";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { githubTargetSchema } from "../src/domain/githubSchema.ts";
import {
  githubEndpoint,
  projectGithubResponse,
  readGithubJson,
} from "../src/domain/githubWire.ts";

const PREFIX = "/api/connector";
const COOKIE = "lifeos_connector";
const hash = (value) => createHash("sha256").update(value).digest();
const equal = (a, b) => timingSafeEqual(hash(a), hash(b));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.github.com; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};
class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function connectorConfig(env) {
  const token = env.LIFEOS_GITHUB_TOKEN?.trim() || "";
  if (token && !/^[\x21-\x7e]{10,500}$/.test(token))
    throw new Error("Jeton serveur invalide.");
  const entries = (env.LIFEOS_GITHUB_REPOSITORIES || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (
    entries.length > 100 ||
    entries.some((item) => {
      const [owner, repo, extra] = item.split("/");
      return (
        extra !== undefined ||
        !githubTargetSchema.safeParse({ owner, repo, kind: "issue", number: 1 })
          .success
      );
    })
  )
    throw new Error(
      "Liste LIFEOS_GITHUB_REPOSITORIES invalide : owner/repo séparés par des virgules.",
    );
  if (Boolean(token) !== Boolean(entries.length))
    throw new Error(
      "Configurez ensemble le jeton serveur et les dépôts autorisés.",
    );
  const port = Number(env.LIFEOS_CONNECTOR_PORT || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Port serveur invalide (1024 à 65535).");
  return { token, repositories: new Set(entries), port, ai: aiConfig(env) };
}
async function staticFiles(root) {
  const files = new Map();
  async function visit(directory, prefix) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const path = join(directory, entry.name),
        url = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await visit(path, url);
      else if (entry.isFile() && types[extname(entry.name)])
        files.set(url, path);
    }
  }
  await visit(resolve(root), "");
  if (!files.has("/index.html"))
    throw new Error("Compilation absente. Lancez npm run build.");
  files.set("/", files.get("/index.html"));
  return files;
}
async function bodyJson(req, maximum = 4096) {
  if (req.headers["content-type"] !== "application/json")
    throw new Refusal(415, "JSON requis.");
  if (Number(req.headers["content-length"]) > maximum)
    throw new Refusal(413, "Requête trop volumineuse.");
  const decoder = new StringDecoder("utf8");
  let length = 0,
    raw = "";
  for await (const chunk of req) {
    length += chunk.length;
    if (length > maximum) throw new Refusal(413, "Requête trop volumineuse.");
    raw += decoder.write(chunk);
  }
  try {
    return JSON.parse(raw + decoder.end());
  } catch {
    throw new Refusal(400, "JSON illisible.");
  }
}

// Only this Node process receives the provider token. No arbitrary host, path or
// HTTP method is accepted from the browser. No request/response bodies are logged.
export async function createConnector({
  config,
  distRoot,
  code = randomBytes(16).toString("hex"),
  now = Date.now,
  upstream = fetch,
  timeoutMs = 15000,
  aiTimeoutMs = 60000,
  ledgerPath = resolve(distRoot, "../.local-server/ai-budget.sqlite"),
}) {
  const files = await staticFiles(distRoot);
  const ai = createAi({
    config: config.ai,
    ledgerPath,
    now,
    upstream,
    timeoutMs: aiTimeoutMs,
  });
  const started = now();
  let usedCode = false,
    failures = 0,
    session = null,
    active = null,
    retryAt = 0,
    nextRead = 0;
  let windowStart = now(),
    reads = 0;
  const githubConfigured = Boolean(config.token && config.repositories.size);
  const configured = githubConfigured || ai.configured;
  const cookie = (value, age) =>
    `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=${PREFIX}; Max-Age=${age}`;
  function validSession(req) {
    const parts = (req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item.startsWith(`${COOKIE}=`));
    return Boolean(
      session &&
      session.expiresAt > now() &&
      parts.length === 1 &&
      equal(parts[0].slice(COOKIE.length + 1), session.token),
    );
  }
  const server = createServer(
    { maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 },
    async (req, res) => {
      const send = (status, value, extra = {}) => {
        if (!res.destroyed) {
          res.writeHead(status, {
            ...headers,
            "Content-Type": "application/json; charset=utf-8",
            ...extra,
          });
          res.end(JSON.stringify(value));
        }
      };
      try {
        const origin = `http://127.0.0.1:${server.address().port}`;
        if (
          req.headers.host !== origin.slice(7) ||
          req.headers["x-forwarded-host"] ||
          req.headers["x-forwarded-for"] ||
          req.headers.forwarded
        )
          throw new Refusal(
            403,
            "Utilisez l’adresse locale exacte du serveur LifeOS.",
          );
        const path = (req.url || "").split("?")[0];
        if (
          !path.startsWith("/") ||
          path.includes("%") ||
          path.includes("\\") ||
          path.split("/").some((part) => part === "." || part === "..")
        )
          throw new Refusal(400, "Chemin refusé.");
        const api = path.startsWith("/api/");
        if (!api) {
          if (req.method !== "GET" && req.method !== "HEAD")
            throw new Refusal(405, "Méthode refusée.");
          if (req.headers["sec-fetch-site"] === "cross-site")
            throw new Refusal(
              403,
              "Ouverture externe refusée. Ouvrez l’adresse locale directement.",
            );
          const file = files.get(path);
          if (!file) throw new Refusal(404, "Fichier absent.");
          const data = await readFile(file);
          res.writeHead(200, {
            ...headers,
            "Content-Type": types[extname(file)],
          });
          res.end(req.method === "HEAD" ? undefined : data);
          return;
        }
        if (
          req.url !== path ||
          req.headers["x-lifeos-request"] !== "1" ||
          (req.headers.origin && req.headers.origin !== origin) ||
          (req.headers["sec-fetch-site"] &&
            !["same-origin", "none"].includes(req.headers["sec-fetch-site"])) ||
          (req.method === "POST" && req.headers.origin !== origin)
        )
          throw new Refusal(403, "Requête locale directe requise.");
        if (path === `${PREFIX}/status` && req.method === "GET") {
          const paired = validSession(req);
          send(200, {
            version: 1,
            githubConfigured,
            paired,
            expiresAt: paired
              ? new Date(session.expiresAt).toISOString()
              : null,
          });
          return;
        }
        if (path === `${PREFIX}/pair` && req.method === "POST") {
          if (!configured)
            throw new Refusal(
              503,
              "Aucun connecteur n’est configuré sur ce serveur.",
            );
          const body = await bodyJson(req);
          // Check after the asynchronous body read: concurrent requests must
          // never redeem the same code twice.
          if (failures >= 5 || usedCode || now() >= started + 600000)
            throw new Refusal(
              429,
              "Code indisponible ou expiré. Redémarrez le serveur pour en obtenir un nouveau.",
            );
          if (
            !body ||
            typeof body !== "object" ||
            Object.keys(body).length !== 1 ||
            typeof body.code !== "string" ||
            !equal(body.code, code)
          ) {
            failures++;
            throw new Refusal(401, "Code d’appairage incorrect.");
          }
          usedCode = true;
          session = {
            token: randomBytes(32).toString("hex"),
            expiresAt: now() + 3600000,
          };
          send(
            200,
            {
              version: 1,
              githubConfigured,
              paired: true,
              expiresAt: new Date(session.expiresAt).toISOString(),
            },
            { "Set-Cookie": cookie(session.token, 3600) },
          );
          return;
        }
        if (path === `${PREFIX}/logout` && req.method === "POST") {
          if (!validSession(req))
            throw new Refusal(401, "Session absente ou expirée.");
          session = null;
          active?.abort();
          ai.revoke();
          send(200, { disconnected: true }, { "Set-Cookie": cookie("", 0) });
          return;
        }
        if (path === `${PREFIX}/ai/status` && req.method === "GET") {
          send(200, ai.status(validSession(req) ? session : null));
          return;
        }
        if (
          [`${PREFIX}/ai/prepare`, `${PREFIX}/ai/execute`].includes(path) &&
          req.method === "POST"
        ) {
          if (!validSession(req))
            throw new Refusal(
              401,
              "Session absente ou expirée. Appairez votre navigateur.",
            );
          const input = await bodyJson(
            req,
            path.endsWith("/prepare") ? 32000 : 4096,
          );
          if (res.destroyed || req.aborted || !validSession(req))
            throw new Refusal(401, "Session expirée ou requête annulée.");
          const authorized = session;
          try {
            const result = path.endsWith("/prepare")
              ? ai.prepare(input, authorized)
              : await ai.execute(
                  input,
                  authorized,
                  req,
                  res,
                  () => session === authorized && validSession(req),
                );
            send(200, result);
          } catch (error) {
            throw new Refusal(
              409,
              error instanceof Error &&
                error.message.length < 300 &&
                !error.message.startsWith("[")
                ? error.message
                : "Requête IA incompatible. Aucun réessai automatique.",
            );
          }
          return;
        }
        if (path !== `${PREFIX}/github/read` || req.method !== "POST")
          throw new Refusal(404, "Opération absente.");
        if (!validSession(req))
          throw new Refusal(
            401,
            "Session absente ou expirée. Vérifiez l’appairage du serveur.",
          );
        const parsed = githubTargetSchema.safeParse(await bodyJson(req));
        if (!parsed.success)
          throw new Refusal(400, "Référence GitHub incompatible.");
        if (res.destroyed || req.aborted || !validSession(req))
          throw new Refusal(401, "Lecture annulée ou session expirée.");
        const target = parsed.data;
        if (!config.repositories.has(`${target.owner}/${target.repo}`))
          throw new Refusal(
            403,
            "Ce dépôt n’est pas autorisé par la configuration du serveur.",
          );
        if (now() - windowStart >= 3600000) {
          windowStart = now();
          reads = 0;
        }
        if (active || now() < retryAt || now() < nextRead || reads >= 60)
          throw new Refusal(
            429,
            "Lecture déjà en cours, cadence ou quota atteints. Attendez avant de réessayer.",
          );
        reads++;
        nextRead = now() + 1000;
        const controller = new AbortController();
        active = controller;
        const currentSession = session;
        const cancel = () => {
          if (!res.writableEnded) controller.abort();
        };
        res.on("close", cancel);
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await upstream(githubEndpoint(target), {
            method: "GET",
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2026-03-10",
              Authorization: `Bearer ${config.token}`,
              "User-Agent": "LifeOS-local-connector",
            },
          });
          if (!response.ok) {
            await response.body?.cancel();
            if (
              response.status === 429 ||
              (response.status === 403 &&
                (response.headers.get("x-ratelimit-remaining") === "0" ||
                  response.headers.has("retry-after")))
            ) {
              const seconds = Number(response.headers.get("retry-after"));
              const reset =
                Number(response.headers.get("x-ratelimit-reset")) * 1000;
              retryAt =
                seconds > 0
                  ? now() + Math.min(seconds, 86400) * 1000
                  : reset > now()
                    ? Math.min(reset, now() + 86400000)
                    : now() + 60000;
              throw new Refusal(
                429,
                "GitHub demande une attente. Aucun réessai automatique ; le dernier relevé reste conservé.",
              );
            }
            const errors = {
              401: "Le jeton du serveur est refusé par GitHub. Vérifiez-le côté serveur.",
              403: "GitHub refuse cet accès. Vérifiez les permissions du jeton côté serveur.",
              404: "Lien absent ou inaccessible au jeton du serveur.",
            };
            throw new Refusal(
              502,
              errors[response.status] ||
                "GitHub est indisponible. Le dernier relevé reste conservé.",
            );
          }
          let check;
          try {
            check = projectGithubResponse(
              target,
              await readGithubJson(response),
            );
          } catch {
            throw new Refusal(
              502,
              "Réponse GitHub incompatible ou trop volumineuse. Aucun relevé conservé.",
            );
          }
          if (
            controller.signal.aborted ||
            session !== currentSession ||
            !validSession(req)
          )
            throw new Refusal(
              401,
              "Lecture annulée ou session expirée. Aucun relevé transmis.",
            );
          send(200, { target, check });
        } catch (error) {
          if (error instanceof Refusal) throw error;
          throw new Refusal(
            502,
            "Connexion GitHub interrompue ou délai dépassé. Le dernier relevé reste conservé.",
          );
        } finally {
          clearTimeout(timeout);
          res.off("close", cancel);
          active = null;
        }
      } catch (error) {
        // Upstream bodies, URLs, secrets and exception messages never reach errors.
        send(error instanceof Refusal ? error.status : 500, {
          error:
            error instanceof Refusal
              ? error.message
              : "Opération impossible sur le serveur LifeOS.",
        });
      }
    },
  );
  server.maxConnections = 20;
  server.on("close", () => {
    active?.abort();
    session = null;
    ai.close();
  });
  return { server, code };
}
