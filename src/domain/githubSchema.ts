import { z } from "zod";
import { id } from "./validation.ts";
export const githubTargetSchema = z
  .object({
    owner: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/)
      .toLowerCase(),
    repo: z
      .string()
      .regex(/^[a-zA-Z0-9_.-]{1,100}$/)
      .refine((value) => value !== "." && value !== "..")
      .toLowerCase(),
    kind: z.enum(["issue", "pull", "run"]),
    number: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type GithubTarget = z.infer<typeof githubTargetSchema>;
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const common = {
  id,
  checkedAt: z.string().datetime(),
  title: z.string().trim().min(1).max(1000),
  remoteUpdatedAt: z.string().datetime(),
};
export const githubCheckSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...common,
      kind: z.literal("issue"),
      state: z.enum(["open", "closed"]),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("pull"),
      state: z.enum(["open", "closed"]),
      merged: z.boolean(),
      draft: z.boolean(),
      headSha: sha,
    })
    .strict()
    .refine(
      (value) => !value.merged || value.state === "closed",
      "Une PR fusionnée doit être fermée.",
    ),
  z
    .object({
      ...common,
      kind: z.literal("run"),
      status: z.string().min(1).max(80),
      conclusion: z.string().min(1).max(80).nullable(),
      headSha: sha,
      attempt: z.number().int().positive().max(1000000),
    })
    .strict()
    .refine(
      (value) => value.status === "completed" || value.conclusion === null,
      "Une exécution non terminée n’a pas de conclusion.",
    ),
]);
export type GithubCheck = z.infer<typeof githubCheckSchema>;
export const githubLinkSchema = z
  .object({
    id,
    missionId: id,
    target: githubTargetSchema,
    createdAt: z.string().datetime(),
    checks: z.array(githubCheckSchema).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.checks.some((check) => check.kind !== value.target.kind))
      context.addIssue({
        code: "custom",
        message: "Relevé GitHub d’un type différent du lien.",
      });
  });
export type GithubLink = z.infer<typeof githubLinkSchema>;
export function githubUrl(target: GithubTarget): string {
  const path =
    target.kind === "run"
      ? "actions/runs"
      : target.kind === "pull"
        ? "pull"
        : "issues";
  return `https://github.com/${target.owner}/${target.repo}/${path}/${target.number}`;
}
export function parseGithubUrl(value: string): GithubTarget {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname.includes("%")
    )
      throw new Error();
    const match =
      /^\/([^/]+)\/([^/]+)\/(issues|pull|actions\/runs)\/([1-9][0-9]*)\/?$/.exec(
        url.pathname,
      );
    if (!match) throw new Error();
    return githubTargetSchema.parse({
      owner: match[1],
      repo: match[2],
      kind:
        match[3] === "issues" ? "issue" : match[3] === "pull" ? "pull" : "run",
      number: Number(match[4]),
    });
  } catch {
    throw new Error(
      "Utilisez le lien HTTPS direct d’une issue, d’une pull request ou d’une exécution GitHub.com, sans paramètre ni fragment.",
    );
  }
}
export function githubKey(target: GithubTarget) {
  return githubUrl(target).toLowerCase();
}
