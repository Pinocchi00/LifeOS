import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  connectorStatus,
  disconnectConnector,
  pairConnector,
  readPrivateGithub,
  supportsConnector,
} from "./connector";
import { Capacitor } from "@capacitor/core";
import { parseGithubUrl } from "../domain/githubSchema";
const target = parseGithubUrl("https://github.com/example/private/pull/42");
const status = {
  version: 1,
  githubConfigured: true,
  paired: true,
  expiresAt: "2026-10-19T13:00:00Z",
};
const check = {
  id: "check",
  checkedAt: "2026-10-19T12:00:00Z",
  kind: "pull",
  title: "Fictif",
  remoteUpdatedAt: "2026-10-19T12:00:00Z",
  state: "closed",
  merged: true,
  draft: false,
  headSha: "a".repeat(40),
};
beforeEach(() => {
  vi.stubGlobal("window", {
    location: { hostname: "127.0.0.1", protocol: "http:" },
  });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("aucune connexion à l’import ; HTTPS de même origine ou boucle locale, repli Android", () => {
  expect(fetch).not.toHaveBeenCalled();
  expect(supportsConnector()).toBe(true);
  vi.stubGlobal("window", {
    location: { hostname: "example.test", protocol: "https:" },
  });
  expect(supportsConnector()).toBe(true);
  vi.stubGlobal("window", {
    location: { hostname: "example.test", protocol: "http:" },
  });
  expect(supportsConnector()).toBe(false);
  vi.stubGlobal("window", {
    location: { hostname: "127.0.0.1", protocol: "http:" },
  });
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  expect(supportsConnector()).toBe(false);
});
it("vérification locale sans fournisseur, appairage et déconnexion avec session same-origin seulement", async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(Response.json(status))
    .mockResolvedValueOnce(Response.json(status))
    .mockResolvedValueOnce(Response.json({ disconnected: true }));
  await connectorStatus();
  await pairConnector("one-time-code");
  await disconnectConnector();
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls.map(([url]) => url)).toEqual([
    "/api/connector/status",
    "/api/connector/pair",
    "/api/connector/logout",
  ]);
  expect(calls[0][1]).toMatchObject({
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: { "X-LifeOS-Request": "1" },
  });
  expect(calls[0][1]).not.toHaveProperty("body");
  expect(calls[1][1]?.body).toBe(JSON.stringify({ code: "one-time-code" }));
  expect(JSON.stringify(calls)).not.toContain("Authorization");
});
it("lecture privée : seuls dépôt/type/numéro sont transmis, réponse stricte d’identité contrôlée", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ target, check }));
  expect(await readPrivateGithub(target)).toEqual(check);
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("/api/connector/github/read");
  expect(options?.body).toBe(JSON.stringify(target));
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ target: { ...target, repo: "other" }, check }),
  );
  await expect(readPrivateGithub(target)).rejects.toThrow("autre lien");
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ target, check: { ...check, token: "unexpected" } }),
  );
  await expect(readPrivateGithub(target)).rejects.toThrow();
});
it("serveur absent, refus et réseau indisponible ne déclenchent aucun repli public", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response("<html>App</html>", {
      headers: { "Content-Type": "text/html" },
    }),
  );
  await expect(connectorStatus()).rejects.toThrow("absent");
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ error: "Session expirée." }, { status: 401 }),
  );
  await expect(readPrivateGithub(target)).rejects.toThrow("Session expirée");
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network error"));
  await expect(readPrivateGithub(target)).rejects.toThrow("hors ligne");
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(
    vi
      .mocked(fetch)
      .mock.calls.every(([url]) => String(url).startsWith("/api/connector/")),
  ).toBe(true);
});
it("annulation avant et pendant lecture et délai de dix-huit secondes", async () => {
  const before = new AbortController();
  before.abort();
  await expect(readPrivateGithub(target, before.signal)).rejects.toThrow(
    "annulée",
  );
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockImplementation(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options!.signal!.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        ),
      ),
  );
  const during = new AbortController();
  const result = readPrivateGithub(target, during.signal);
  during.abort();
  await expect(result).rejects.toThrow("annulée");
  vi.useFakeTimers();
  const timed = expect(readPrivateGithub(target)).rejects.toThrow("à temps");
  await vi.advanceTimersByTimeAsync(18000);
  await timed;
});
