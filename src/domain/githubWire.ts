import { z } from "zod";
import {
  githubCheckSchema,
  githubKey,
  githubTargetSchema,
  parseGithubUrl,
  type GithubCheck,
  type GithubTarget,
} from "./githubSchema.ts";
const MAX_BYTES = 1024 * 1024;
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
export async function readGithubJson(response: Response): Promise<unknown> {
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
