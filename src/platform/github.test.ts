import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseGithubUrl } from "../domain/githubSchema";
let api: typeof import("./github");
const sha = "a".repeat(40);
const date = "2026-10-19T12:00:00.000Z";
const url = "https://github.com/a/b/pull/1";
const pull = () => ({
  html_url: url,
  number: 1,
  title: "<img src=x onerror=alert(1)>",
  updated_at: date,
  state: "closed",
  merged: true,
  draft: false,
  head: { sha },
  body: "Texte exclu",
  token: "Jamais conservé",
});
const response = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
beforeEach(async () => {
  vi.resetModules();
  api = await import("./github");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("Lecture publique GitHub", () => {
  it("effectue un GET explicite sans cookies, authentification, redirection ou texte de mission", async () => {
    vi.mocked(fetch).mockResolvedValue(response(pull()));
    const result = await api.readGithub(parseGithubUrl(url));
    expect(fetch).toHaveBeenCalledOnce();
    const [endpoint, options] = vi.mocked(fetch).mock.calls[0];
    expect(endpoint).toBe("https://api.github.com/repos/a/b/pulls/1");
    expect(options).toMatchObject({
      method: "GET",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });
    expect(options).not.toHaveProperty("body");
    expect(JSON.stringify(options)).not.toContain("Authorization");
    expect(result.kind).toBe("pull");
    expect(result.title).toContain("<img");
    expect(result).not.toHaveProperty("body");
    expect(result).not.toHaveProperty("token");
  });
  it("projette une issue et une tentative de CI avec leur vraie identité", () => {
    const issue = api.projectGithubResponse(
      parseGithubUrl("https://github.com/a/b/issues/2"),
      {
        html_url: "https://github.com/a/b/issues/2",
        number: 2,
        title: "Problème",
        state: "open",
        updated_at: date,
      },
    );
    expect(issue.kind).toBe("issue");
    const run = api.projectGithubResponse(
      parseGithubUrl("https://github.com/a/b/actions/runs/3"),
      {
        html_url: "https://github.com/a/b/actions/runs/3",
        id: 3,
        name: "Tests",
        display_title: "Un changement",
        status: "completed",
        conclusion: "failure",
        updated_at: date,
        head_sha: sha,
        run_attempt: 2,
      },
    );
    expect(run).toMatchObject({
      kind: "run",
      attempt: 2,
      conclusion: "failure",
      headSha: sha,
    });
  });
  it("refuse les identités détournées, numéros différents et PR déguisées en issues", () => {
    expect(() =>
      api.projectGithubResponse(parseGithubUrl(url), {
        ...pull(),
        html_url: "https://evil.test/a/b/pull/1",
      }),
    ).toThrow();
    expect(() =>
      api.projectGithubResponse(parseGithubUrl(url), { ...pull(), number: 2 }),
    ).toThrow("Numéro");
    expect(() =>
      api.projectGithubResponse(parseGithubUrl(url), {
        ...pull(),
        html_url: "https://github.com/a/other/pull/1",
      }),
    ).toThrow("autre lien");
    expect(() =>
      api.projectGithubResponse(
        parseGithubUrl("https://github.com/a/b/issues/1"),
        { ...pull(), pull_request: {} },
      ),
    ).toThrow("pull request");
  });
  it.each([404, 403, 500])(
    "affiche l’échec HTTP %s sans succès inventé ni nouvelle tentative",
    async (status) => {
      vi.mocked(fetch).mockResolvedValue(
        response({ message: "Texte serveur non affiché" }, status),
      );
      await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow(
        status === 404 ? "publiquement" : status === 403 ? "403" : "500",
      );
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it("respecte Retry-After sans réessai automatique et bloque les lectures pendant l’attente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(date));
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({}, 429, { "Retry-After": "120" }))
      .mockResolvedValue(response(pull()));
    await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow("Quota");
    await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow(
      "attendre",
    );
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(120001);
    expect(fetch).toHaveBeenCalledOnce();
    await expect(api.readGithub(parseGithubUrl(url))).resolves.toHaveProperty(
      "kind",
      "pull",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("respecte la remise à zéro du quota public", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(date));
    vi.mocked(fetch).mockResolvedValue(
      response({}, 403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(Date.now() / 1000 + 600),
      }),
    );
    await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow("Quota");
    await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow(
      "attendre",
    );
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("refuse les réponses invalides, HTML ou trop volumineuses même sans Content-Length", async () => {
    for (const value of [
      response({}),
      new Response("<html>Erreur</html>", {
        headers: { "Content-Type": "text/html" },
      }),
      new Response("é".repeat(600000), {
        headers: { "Content-Type": "application/json" },
      }),
      response(pull(), 200, { "Content-Length": "2000000" }),
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(value);
      await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow();
    }
  });
  it("remonte une erreur réseau lisible et conserve l’annulation comme telle", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow(
      "hors ligne",
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      api.readGithub(parseGithubUrl(url), controller.signal),
    ).rejects.toThrow("annulée");
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("annule une requête en cours et borne l’attente à quinze secondes", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          ),
        ),
    );
    const controller = new AbortController();
    const cancel = expect(
      api.readGithub(parseGithubUrl(url), controller.signal),
    ).rejects.toThrow("annulée");
    controller.abort();
    await cancel;
    const timeout = expect(api.readGithub(parseGithubUrl(url))).rejects.toThrow(
      "15 secondes",
    );
    await vi.advanceTimersByTimeAsync(15000);
    await timeout;
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
