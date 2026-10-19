import { Capacitor } from "@capacitor/core";
import { z } from "zod";
import {
  githubCheckSchema,
  githubKey,
  githubTargetSchema,
  type GithubCheck,
  type GithubTarget,
} from "../domain/githubSchema";
import { readGithubJson } from "../domain/githubWire";
const statusSchema = z
  .object({
    version: z.literal(1),
    githubConfigured: z.boolean(),
    paired: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
  })
  .strict();
export type ConnectorStatus = z.infer<typeof statusSchema>;
function compatible<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error(
      "Réponse du serveur LifeOS incompatible. Aucun relevé conservé.",
    );
  return result.data;
}
export function supportsConnector(): boolean {
  return (
    !Capacitor.isNativePlatform() &&
    ((window.location.protocol === "http:" &&
      window.location.hostname === "127.0.0.1") ||
      window.location.protocol === "https:")
  );
}
export async function connectorRequest(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  durationMs = 18000,
): Promise<unknown> {
  if (!supportsConnector())
    throw new Error(
      "Ouvrez LifeOS à l’adresse du serveur : HTTPS distant ou http://127.0.0.1 sur cet ordinateur. L’application Android conserve l’accès public.",
    );
  if (signal?.aborted) throw new Error("Opération annulée.");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, durationMs);
  try {
    const response = await fetch(`/api/connector/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
      headers: {
        "X-LifeOS-Request": "1",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      await response.body?.cancel();
      throw new Error(
        "Serveur LifeOS absent à cette adresse. Ouvrez l’adresse affichée par npm run connector:start.",
      );
    }
    const value = await readGithubJson(response);
    if (!response.ok) {
      const error = z
        .object({ error: z.string().min(1).max(300) })
        .safeParse(value);
      throw new Error(
        error.success
          ? error.data.error
          : "Le serveur LifeOS refuse cette opération.",
      );
    }
    return value;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        signal?.aborted
          ? "Opération annulée. Vos relevés restent conservés."
          : "Le serveur LifeOS n’a pas répondu à temps. Vos relevés restent conservés.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Serveur LifeOS inaccessible. Vérifiez son adresse, sa disponibilité et son certificat HTTPS ; vos relevés restent disponibles hors ligne.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
export async function connectorStatus(
  signal?: AbortSignal,
): Promise<ConnectorStatus> {
  return compatible(
    statusSchema,
    await connectorRequest("status", undefined, signal),
  );
}
export async function pairConnector(
  code: string,
  signal?: AbortSignal,
): Promise<ConnectorStatus> {
  return compatible(
    statusSchema,
    await connectorRequest("pair", { code }, signal),
  );
}
export async function disconnectConnector(signal?: AbortSignal): Promise<void> {
  compatible(
    z.object({ disconnected: z.literal(true) }).strict(),
    await connectorRequest("logout", {}, signal),
  );
}
export async function readPrivateGithub(
  target: GithubTarget,
  signal?: AbortSignal,
): Promise<GithubCheck> {
  const valid = githubTargetSchema.parse(target);
  const result = compatible(
    z.object({ target: githubTargetSchema, check: githubCheckSchema }).strict(),
    await connectorRequest("github/read", valid, signal),
  );
  if (
    githubKey(result.target) !== githubKey(valid) ||
    result.check.kind !== valid.kind
  )
    throw new Error(
      "Le serveur a renvoyé un relevé pour un autre lien. Aucun relevé conservé.",
    );
  return result.check;
}
