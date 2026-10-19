import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareAi, executeAi, readAiStatus } from "./ai";
import { aiPayload } from "../domain/ai";
const input = { text: "Analyser ce seul texte", maxOutputTokens: 512 as const };
const budget = {
  day: "2026-10-19",
  attempts: 0,
  reservedNanoUsd: 0,
  dailyNanoUsd: 100000000,
  dailyCalls: 1,
};
const quote = () => ({
  id: "a".repeat(32),
  expiresAt: "2026-10-19T12:00:00Z",
  payload: aiPayload(input),
  budget,
});
beforeEach(() => {
  vi.stubGlobal("window", {
    location: { protocol: "http:", hostname: "127.0.0.1" },
  });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());
it("préparation locale explicite, aperçu vérifié et aucun secret client", async () => {
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(quote()));
  await prepareAi(input);
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("/api/connector/ai/prepare");
  expect(options?.credentials).toBe("same-origin");
  expect(options?.body).toBe(JSON.stringify(input));
  expect(JSON.stringify(options)).not.toMatch(/Authorization|api_key/);
});
it("un aperçu altéré est refusé avant toute génération", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      ...quote(),
      payload: { ...aiPayload(input), input: "Autre texte" },
    }),
  );
  await expect(prepareAi(input)).rejects.toThrow("diffère");
  expect(fetch).toHaveBeenCalledOnce();
});
it("changement de modèle de l’aperçu ou de la réponse refusé sans nouvel appel", async () => {
  const claude = { ...input, model: "claude-haiku-5-5" as const };
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(quote()));
  await expect(prepareAi(claude)).rejects.toThrow("diffère");
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      responseId: "msg_fixture",
      model: "claude-sonnet-5-5",
      receivedAt: "2026-10-19T12:00:00Z",
      status: "completed",
      text: "Brouillon",
      refusal: false,
      inputTokens: 100,
      outputTokens: 100,
      estimatedNanoUsd: 1250000,
      reservedNanoUsd: 100000000,
    }),
  );
  await expect(
    executeAi("a".repeat(32), undefined, claude.model),
  ).rejects.toThrow("diffère");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("confirmation liée au seul aperçu et aucune répétition après refus du serveur", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ error: "Enveloppe conservée" }, { status: 409 }),
  );
  await expect(executeAi("a".repeat(32))).rejects.toThrow("Enveloppe");
  expect(fetch).toHaveBeenCalledOnce();
  expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(
    JSON.stringify({ quoteId: "a".repeat(32), confirmed: true }),
  );
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({
      configured: false,
      paired: false,
      expiresAt: null,
      budget: null,
      catalogFresh: true,
      providers: { OpenAI: true, Anthropic: false },
    }),
  );
  expect((await readAiStatus()).configured).toBe(false);
});
