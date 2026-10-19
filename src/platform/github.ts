import { z } from "zod";
import type { GithubCheck, GithubTarget } from "../domain/githubSchema";
import {
  githubEndpoint,
  projectGithubResponse,
  readGithubJson,
} from "../domain/githubWire";
export { githubEndpoint, projectGithubResponse } from "../domain/githubWire";
const API_VERSION = "2026-03-10";
let retryAt = 0;
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
    const raw = await readGithubJson(response);
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
