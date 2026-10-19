import { z } from "zod";
import {
  githubCheckSchema,
  githubKey,
  githubTargetSchema,
  parseGithubUrl,
  type GithubCheck,
  type GithubTarget,
} from "../domain/githubSchema";
const API_VERSION = "2026-03-10";
const MAX_BYTES = 1024 * 1024;
let retryAt = 0;
const identitySchema = z.object({
  html_url: z.string(),
  updated_at: z.string().datetime(),
});
const issueSchema = identitySchema.extend({
  number: z.number().int(),
  title: z.string(),
  state: z.enum(["open", "closed"]),
  pull_request: z.unknown().optional(),
});
const pullSchema = issueSchema.extend({
  merged: z.boolean(),
  draft: z.boolean(),
  head: z.object({ sha: z.string() }),
});
const runSchema = identitySchema.extend({
  id: z.number().int(),
  name: z.string().nullable(),
  display_title: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  head_sha: z.string(),
  run_attempt: z.number().int(),
});
export function githubEndpoint(value: GithubTarget): string {
  const target = githubTargetSchema.parse(value);
  return `https://api.github.com/repos/${target.owner}/${target.repo}/${target.kind === "run" ? "actions/runs" : target.kind === "pull" ? "pulls" : "issues"}/${target.number}`;
}
export function projectGithubResponse(
  target: GithubTarget,
  raw: unknown,
): GithubCheck {
  const common = {
    id: crypto.randomUUID(),
    checkedAt: new Date().toISOString(),
  };
  let result: GithubCheck;
  let identity: z.infer<typeof identitySchema>;
  if (target.kind === "run") {
    const value = runSchema.parse(raw);
    identity = value;
    if (value.id !== target.number)
      throw new Error("Identifiant GitHub inattendu.");
    result = githubCheckSchema.parse({
      ...common,
      kind: "run",
      title: value.name || value.display_title,
      remoteUpdatedAt: value.updated_at,
      status: value.status,
      conclusion: value.conclusion,
      headSha: value.head_sha,
      attempt: value.run_attempt,
    });
  } else {
    if (target.kind === "issue") {
      const value = issueSchema.parse(raw);
      identity = value;
      if (value.pull_request)
        throw new Error(
          "Ce numéro est une pull request. Ajoutez son lien /pull/ plutôt que /issues/.",
        );
      if (value.number !== target.number)
        throw new Error("Numéro GitHub inattendu.");
      result = githubCheckSchema.parse({
        ...common,
        kind: "issue",
        title: value.title,
        remoteUpdatedAt: value.updated_at,
        state: value.state,
      });
    } else {
      const value = pullSchema.parse(raw);
      identity = value;
      if (value.number !== target.number)
        throw new Error("Numéro GitHub inattendu.");
      result = githubCheckSchema.parse({
        ...common,
        kind: "pull",
        title: value.title,
        remoteUpdatedAt: value.updated_at,
        state: value.state,
        merged: value.merged,
        draft: value.draft,
        headSha: value.head.sha,
      });
    }
  }
  if (githubKey(parseGithubUrl(identity.html_url)) !== githubKey(target))
    throw new Error(
      "La réponse GitHub désigne un autre lien. Aucun relevé conservé.",
    );
  return result;
}
async function readJson(response: Response): Promise<unknown> {
  if (
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .includes("application/json")
  ) {
    await response.body?.cancel();
    throw new Error("Réponse GitHub inattendue : le JSON attendu est absent.");
  }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel();
    throw new Error("Réponse GitHub trop volumineuse (1 Mo maximum).");
  }
  if (!response.body) throw new Error("Réponse GitHub vide.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Réponse GitHub trop volumineuse (1 Mo maximum).");
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        "Réponse GitHub illisible. Aucun relevé ni statut de mission modifié.",
      );
    }
  } finally {
    reader.releaseLock();
  }
}
export async function readGithub(
  target: GithubTarget,
  signal?: AbortSignal,
): Promise<GithubCheck> {
  const endpoint = githubEndpoint(target);
  if (signal?.aborted)
    throw new Error(
      "Lecture annulée. Les relevés conservés restent disponibles.",
    );
  if (Date.now() < retryAt)
    throw new Error(
      `GitHub demande d’attendre. Prochaine tentative après ${new Date(retryAt).toLocaleTimeString("fr-FR")}.`,
    );
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15000);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": API_VERSION,
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
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        retryAt =
          seconds > 0
            ? Date.now() + Math.min(seconds, 86400) * 1000
            : reset > Date.now()
              ? Math.min(reset, Date.now() + 86400000)
              : Date.now() + 60000;
        throw new Error(
          `Quota ou cadence GitHub atteints. Réessayez après ${new Date(retryAt).toLocaleTimeString("fr-FR")}. Le dernier relevé reste conservé.`,
        );
      }
      if (response.status === 404)
        throw new Error(
          "Lien introuvable ou non accessible publiquement. Vérifiez son adresse sur GitHub. Le dernier relevé reste conservé.",
        );
      if (response.status === 403)
        throw new Error(
          "GitHub refuse cet accès public (403). Réessayez plus tard ou consultez le lien sur GitHub.",
        );
      throw new Error(
        `Lecture GitHub impossible (${response.status}). Le dernier relevé reste conservé.`,
      );
    }
    const raw = await readJson(response);
    try {
      return projectGithubResponse(target, raw);
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new Error(
          "Réponse GitHub incompatible. Aucun relevé ni statut de mission modifié.",
        );
      throw error;
    }
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        timedOut
          ? "GitHub n’a pas répondu en 15 secondes. Réessayez ; vos relevés restent conservés."
          : "Lecture annulée. Les relevés conservés restent disponibles.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Connexion à GitHub impossible : réseau indisponible ou requête refusée. Vos relevés restent consultables hors ligne.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
