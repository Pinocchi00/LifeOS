import { describe, expect, it } from "vitest";
import {
  briefing,
  dataSchema,
  emptyData,
  parseBackup,
  serializeBackup,
  storedDataSchema,
  type Task,
} from "./model";
import {
  adviceCandidates,
  changePreferences,
  clearRevisions,
  currentAdvice,
  recordFeedback,
  restorePreferences,
  withdrawFeedback,
} from "./adaptation";
import {
  defaultPreferences,
  decisionSchema,
  preferencesSchema,
} from "./adaptationSchema";
const today = "2026-10-19";
const date = "2026-10-19T10:00:00.000Z";
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Un choix",
  description: "",
  status: "todo",
  priority: "medium",
  due: today,
  projectId: "",
  createdAt: date,
  completedAt: null,
  ...patch,
});
const preferences = (count = 1) => ({
  ...defaultPreferences(),
  priorityCount: count,
});
describe("Choix explicites et versions réversibles", () => {
  it("conserve le point de départ, restaure en ajoutant une version et laisse les tâches intactes", () => {
    const original = { ...emptyData(), tasks: [task()] };
    const changed = changePreferences(
      original,
      preferences(),
      "Semaine chargée",
    );
    expect(changed.adaptation.revisions).toHaveLength(2);
    expect(changed.adaptation.revisions[0].preferences).toEqual(
      defaultPreferences(),
    );
    const restored = restorePreferences(
      changed,
      changed.adaptation.revisions[0].id,
    );
    expect(restored.adaptation.revisions).toHaveLength(3);
    expect(restored.adaptation.revisions.slice(0, 2)).toEqual(
      changed.adaptation.revisions,
    );
    expect(restored.adaptation.revisions[2].restoredFromId).toBe(
      changed.adaptation.revisions[0].id,
    );
    expect(restored.adaptation.preferences).toEqual(defaultPreferences());
    expect(restored.tasks).toEqual(original.tasks);
    expect(original.adaptation.revisions).toEqual([]);
    expect(dataSchema.parse(restored)).toEqual(restored);
  });
  it("exige un vrai changement motivé et refuse une restauration absente", () => {
    expect(() =>
      changePreferences(emptyData(), defaultPreferences(), "Rien"),
    ).toThrow("déjà");
    expect(() => changePreferences(emptyData(), preferences(), " ")).toThrow(
      "Décrivez",
    );
    expect(() => restorePreferences(emptyData(), "absent")).toThrow("plus");
    expect(
      preferencesSchema.safeParse({ ...preferences(), priorityCount: 0 })
        .success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        ...preferences(),
        mutedRules: ["load", "load"],
      }).success,
    ).toBe(false);
  });
  it("permet de libérer un historique plein sans changer les réglages", () => {
    let data = emptyData();
    for (let i = 0; i < 499; i++)
      data = changePreferences(data, preferences(i % 2 ? 2 : 1), `Choix ${i}`);
    expect(data.adaptation.revisions).toHaveLength(500);
    expect(() => changePreferences(data, preferences(4), "Encore")).toThrow(
      "plein",
    );
    const cleared = clearRevisions(data);
    expect(cleared.adaptation.revisions).toHaveLength(1);
    expect(cleared.adaptation.preferences).toEqual(data.adaptation.preferences);
    expect(
      dataSchema.safeParse(changePreferences(cleared, preferences(4), "Suite"))
        .success,
    ).toBe(true);
  });
  it("applique le nombre et l’ordre au briefing, sans avancer les tâches futures", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task({ id: "high", priority: "high", due: today }),
        task({ id: "early", priority: "low", due: "2026-10-18" }),
        task({ id: "future", priority: "high", due: "2026-11-01" }),
      ],
    };
    expect(briefing(data, today).priorities.map((item) => item.id)).toEqual([
      "high",
      "early",
    ]);
    const changed = changePreferences(
      data,
      { ...preferences(), taskOrder: "due" },
      "Échéances d’abord",
    );
    expect(briefing(changed, today).priorities.map((item) => item.id)).toEqual([
      "early",
    ]);
    expect(changed.tasks).toEqual(data.tasks);
  });
  it("départage les égalités par création puis identifiant, indépendamment de l’ordre stocké", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task({ id: "z" }),
        task({ id: "a" }),
        task({ id: "old", createdAt: "2026-10-18T10:00:00.000Z" }),
      ],
    };
    expect(briefing(data, today).priorities.map((item) => item.id)).toEqual([
      "old",
      "a",
      "z",
    ]);
  });
});
describe("Conseils expliqués et retours sans apprentissage caché", () => {
  it("ordonne les règles et compte une tâche planifiée et échue une seule fois", () => {
    const data = changePreferences(
      {
        ...emptyData(),
        tasks: [
          task({ due: "2026-10-18" }),
          task({
            id: "today",
            schedule: { day: today, start: "09:00", duration: 30 },
          }),
          task({ id: "second" }),
        ],
      },
      preferences(),
      "Un cap",
    );
    const candidates = adviceCandidates(data, today);
    expect(candidates.map((item) => item.ruleId)).toEqual([
      "overdue",
      "load",
      "reserve",
    ]);
    expect(candidates[1].evidence).toContain(
      "Tâches du jour, sans doublon : 2",
    );
    expect(candidates[0].reason).toContain(
      "créneau réservé n’est pas une échéance",
    );
  });
  it("écarte pour un seul jour, permet d’annuler, conserve la proposition et les préférences", () => {
    const original = { ...emptyData(), tasks: [task({ due: "2026-10-18" })] };
    const advice = currentAdvice(original, today)!;
    const deferred = recordFeedback(original, advice, "later", today);
    expect(currentAdvice(deferred, today)?.ruleId).toBe("reserve");
    expect(currentAdvice(deferred, "2026-10-20")?.ruleId).toBe("overdue");
    expect(deferred.adaptation.preferences).toEqual(
      original.adaptation.preferences,
    );
    const withdrawn = withdrawFeedback(
      deferred,
      deferred.adaptation.feedback[0].id,
    );
    expect(currentAdvice(withdrawn, today)).toEqual(advice);
    expect(withdrawn.adaptation.feedback[0].withdrawnAt).not.toBeNull();
    expect(withdrawn.adaptation.feedback[0].evidence).toEqual(advice.evidence);
    expect(dataSchema.safeParse(withdrawn).success).toBe(true);
    const removed = { ...deferred, tasks: [] };
    expect(removed.adaptation.feedback[0].title).toBe(advice.title);
  });
  it("enregistre utile sans modifier les conseils, rejette un doublon et une proposition périmée", () => {
    const original = emptyData();
    const advice = currentAdvice(original, today)!;
    const reacted = recordFeedback(original, advice, "useful", today);
    expect(currentAdvice(reacted, today)).toEqual(advice);
    expect(reacted.adaptation.preferences).toEqual(defaultPreferences());
    expect(() => recordFeedback(reacted, advice, "later", today)).toThrow(
      "déjà",
    );
    expect(() =>
      recordFeedback({ ...original, tasks: [task()] }, advice, "useful", today),
    ).toThrow("changé");
    expect(() =>
      recordFeedback(original, advice, "useful", "2026-10-20"),
    ).toThrow("changé");
  });
  it("respecte les types masqués et l’arrêt global ; ne consulte aucune donnée Vie", () => {
    const data = { ...emptyData(), tasks: [task({ due: "2026-10-18" })] };
    const changed = changePreferences(
      data,
      { ...defaultPreferences(), mutedRules: ["overdue"] },
      "Masquer",
    );
    expect(currentAdvice(changed, today)?.ruleId).toBe("reserve");
    const stopped = changePreferences(
      changed,
      { ...changed.adaptation.preferences, suggestions: false },
      "Pause",
    );
    expect(currentAdvice(stopped, today)).toBeNull();
    const extra = {
      ...data,
      personal: { sleep: ["confidentiel"], habits: ["privé"] },
    };
    expect(adviceCandidates(extra, today)).toEqual(
      adviceCandidates(data, today),
    );
    expect(JSON.stringify(adviceCandidates(extra, today))).not.toContain(
      "confidentiel",
    );
  });
  it("ne propose pas de réserver une tâche exclusivement future ou terminée", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task({ due: "2026-11-01" }),
        task({ id: "done", status: "done", completedAt: date }),
      ],
    };
    expect(adviceCandidates(data, today)).toEqual([]);
  });
});
describe("Intégrité et migration v5", () => {
  it("migre v4 en préservant les données, ajoute seulement l’adaptation vide", () => {
    const { githubLinks, adaptation, ...v4 } = { ...emptyData(), tasks: [task()] };
    expect(storedDataSchema.parse({ ...v4, version: 4 })).toEqual({
      ...v4,
      adaptation,
      version: 6,
      githubLinks,
    });
  });
  it("refuse les versions actives incohérentes, restaurations vers le futur, identifiants et retours dupliqués", () => {
    const data = changePreferences(emptyData(), preferences(), "Rythme choisi");
    for (const adaptation of [
      { ...data.adaptation, activeRevisionId: "absent" },
      { ...data.adaptation, preferences: defaultPreferences() },
      {
        ...data.adaptation,
        revisions: data.adaptation.revisions.map((item, index) =>
          index
            ? item
            : { ...item, restoredFromId: data.adaptation.revisions[1].id },
        ),
      },
    ])
      expect(dataSchema.safeParse({ ...data, adaptation }).success).toBe(false);
    const feedback = recordFeedback(
      data,
      currentAdvice(data, today)!,
      "useful",
      today,
    );
    expect(
      dataSchema.safeParse({
        ...feedback,
        adaptation: {
          ...feedback.adaptation,
          feedback: [
            ...feedback.adaptation.feedback,
            { ...feedback.adaptation.feedback[0], id: "other" },
          ],
        },
      }).success,
    ).toBe(false);
    expect(
      dataSchema.safeParse({
        ...data,
        tasks: [task({ id: data.adaptation.activeRevisionId })],
      }).success,
    ).toBe(false);
  });
  it("sauvegarde les décisions et instantanés avec les réglages, sans données Vie", () => {
    let data = changePreferences(emptyData(), preferences(), "Ralentir");
    data = recordFeedback(data, currentAdvice(data, today)!, "useful", today);
    data.adaptation.decisions.push(
      decisionSchema.parse({
        id: "decision",
        title: "Étudier",
        choice: "Une étape par semaine",
        context: "Temps limité",
        reason: "Garder le rythme",
        reviewDay: today,
        status: "active",
        createdAt: date,
        updatedAt: date,
      }),
    );
    const raw = serializeBackup(data);
    expect(parseBackup(raw)).toEqual(data);
    expect(JSON.parse(raw).data.version).toBe(6);
    expect(JSON.parse(raw).data).not.toHaveProperty("personal");
    expect(
      decisionSchema.safeParse({
        ...data.adaptation.decisions[0],
        reviewDay: "2026-02-30",
      }).success,
    ).toBe(false);
  });
});
