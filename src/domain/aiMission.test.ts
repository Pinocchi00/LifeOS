import { expect, it } from "vitest";
import { emptyData, dataSchema, serializeBackup } from "./model";
import { adoptAiDraft, missionAiText } from "./aiMission";
import { aiCatalog, aiDraftSchema, aiInputSchema, aiPayload } from "./ai";
const time = "2026-10-19T12:00:00Z";
const data = () => ({
  ...emptyData(),
  missions: [
    {
      id: "m",
      title: "Analyse",
      assistant: "chatgpt" as const,
      projectId: "",
      objective: "Proposer des étapes",
      criteria: "Des faits vérifiables",
      files: "DO-NOT-INCLUDE-FILE",
      due: "",
      status: "review" as const,
      reports: [],
      createdAt: time,
      updatedAt: time,
      validatedAt: null,
    },
  ],
});
const draft = () =>
  aiDraftSchema.parse({
    responseId: "resp_fixture",
    model: aiCatalog.model,
    receivedAt: time,
    status: "completed",
    text: "<img src=x> Une proposition.",
    refusal: false,
    inputTokens: 200,
    outputTokens: 100,
    estimatedNanoUsd: 1700000,
    reservedNanoUsd: 100000000,
  });
it("préparation minimale sans fichiers, rapports, GitHub ni Vie", () => {
  const mission = data().missions[0];
  const text = missionAiText(mission);
  expect(text).toContain(mission.objective);
  expect(text).not.toContain(mission.files);
  const payload = aiPayload({ text, maxOutputTokens: 512 });
  expect(payload).toMatchObject({
    model: aiCatalog.model,
    input: text,
    tools: [],
    store: false,
    background: false,
    stream: false,
    tool_choice: "none",
    max_output_tokens: 512,
    service_tier: "default",
  });
  expect(JSON.stringify(payload)).not.toMatch(
    /DO-NOT-INCLUDE|Authorization|personal/,
  );
});
it("bornes strictes des entrées, aucune clé/cible/modèle arbitraire", () => {
  for (const value of [
    { text: "", maxOutputTokens: 512 },
    { text: "x".repeat(6001), maxOutputTokens: 512 },
    { text: "test", maxOutputTokens: 99999 },
    { text: "test", maxOutputTokens: 512, model: "other" },
  ])
    expect(aiInputSchema.safeParse(value).success).toBe(false);
});
it("adoption explicite en compte-rendu non vérifié, statut et validation conservés, export v6", () => {
  const previous = data();
  const result = adoptAiDraft(previous, "m", draft());
  expect(previous.missions[0].reports).toHaveLength(0);
  expect(result.missions[0].status).toBe("review");
  expect(result.missions[0].validatedAt).toBeNull();
  expect(result.missions[0].reports[0].body).toContain(
    "BROUILLON IA — NON VÉRIFIÉ",
  );
  expect(result.missions[0].reports[0].body).toContain("resp_fixture");
  expect(result.missions[0].reports[0].evidence).toBe(aiCatalog.source);
  expect(dataSchema.safeParse(result).success).toBe(true);
  expect(serializeBackup(result)).toContain("resp_fixture");
});
it("refus et réponse incomplète sont conservés avec leur avertissement", () => {
  const result = adoptAiDraft(data(), "m", {
    ...draft(),
    status: "incomplete",
    refusal: true,
  });
  expect(result.missions[0].reports[0].body).toContain("RÉPONSE INCOMPLÈTE");
  expect(result.missions[0].reports[0].body).toContain("REFUS DU MODÈLE");
});
it("doublon, mission absente, mauvais assistant et texte trop grand refusés", () => {
  const result = adoptAiDraft(data(), "m", draft());
  expect(() => adoptAiDraft(result, "m", draft())).toThrow("déjà conservé");
  expect(() => adoptAiDraft(data(), "absent", draft())).toThrow("absente");
  expect(() =>
    adoptAiDraft(
      { ...data(), missions: [{ ...data().missions[0], assistant: "claude" }] },
      "m",
      draft(),
    ),
  ).toThrow("absente");
  expect(() =>
    adoptAiDraft(data(), "m", { ...draft(), text: "x".repeat(8001) }),
  ).toThrow();
});
