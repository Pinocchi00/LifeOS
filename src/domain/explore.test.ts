import { describe, expect, it } from "vitest";
import {
  type Data,
  dataSchema,
  emptyData,
  parseBackup,
  removeProject,
  serializeBackup,
  storedDataSchema,
} from "./model";
import {
  type Resource,
  type LearningPath,
  resourceSchema,
  sourceUrl,
} from "./exploreSchema";
import {
  canonicalSource,
  duplicateResource,
  ideaFromResource,
  makeLearningEntry,
  normalizeSearch,
  pathProgress,
  removeLearningPath,
  removeNote,
  removeResource,
  saveLearningPath,
  toggleLearningStep,
} from "./explore";
const date = "2026-10-19T10:00:00.000Z";
const resource = (patch: Partial<Resource> = {}): Resource => ({
  id: "r1",
  title: "Écologie appliquée",
  kind: "article",
  source: "Source déclarée",
  url: "https://example.test/guide",
  reference: "",
  publishedOn: "",
  consultedOn: "",
  summary: "Une annotation locale",
  tags: ["Écologie"],
  status: "saved",
  completedAt: null,
  favorite: false,
  projectId: "",
  noteIds: [],
  createdAt: date,
  updatedAt: date,
  ...patch,
});
const path = (patch: Partial<LearningPath> = {}): LearningPath => ({
  id: "p1",
  title: "Comprendre une méthode",
  intention: "La mettre en pratique",
  projectId: "",
  targetDay: "",
  paused: false,
  steps: [
    { id: "s1", title: "Lire et essayer", resourceId: "r1", completedAt: null },
    { id: "s2", title: "Expliquer", resourceId: "", completedAt: null },
  ],
  createdAt: date,
  ...patch,
});
const full = (): Data => {
  const learning = path();
  return {
    ...emptyData(),
    resources: [resource()],
    learningPaths: [learning],
    learningEntries: [
      makeLearningEntry(
        learning,
        "s1",
        "2026-10-19",
        25,
        "Compris avec un essai",
        "2026-10-19",
      ),
    ],
  };
};
describe("Sources et recherche", () => {
  it("accepte les liens HTTP/HTTPS et refuse protocoles exécutables, identifiants et faux liens", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///secret",
      "https://user:secret@example.test/",
      "pas un lien",
    ])
      expect(sourceUrl.safeParse(value).success).toBe(false);
    expect(sourceUrl.safeParse("https://example.test/a?q=1").success).toBe(
      true,
    );
  });
  it("exige une source retrouvable, une date pour les actualités et un état cohérent", () => {
    expect(
      resourceSchema.safeParse(
        resource({
          url: "",
          reference: "Édition locale, page 12",
          kind: "book",
        }),
      ).success,
    ).toBe(true);
    for (const patch of [
      { source: "" },
      { url: "", reference: "" },
      { kind: "news" as const },
      { status: "done" as const },
      { publishedOn: "2026-02-30" },
    ])
      expect(resourceSchema.safeParse(resource(patch)).success).toBe(false);
    expect(
      resourceSchema.safeParse(
        resource({ kind: "news", publishedOn: "2026-10-18" }),
      ).success,
    ).toBe(true);
  });
  it("reconnaît un même lien sans fragment mais conserve les paramètres", () => {
    expect(
      duplicateResource([resource()], "https://example.test/guide#section")?.id,
    ).toBe("r1");
    expect(
      duplicateResource([resource()], "https://example.test/guide", "r1"),
    ).toBeUndefined();
    expect(canonicalSource("https://example.test/guide?q=2#part")).toBe(
      "https://example.test/guide?q=2",
    );
  });
  it("rapproche les accents et prépare une idée sans la créer à la place de l’utilisateur", () => {
    expect(normalizeSearch(" ÉCOLOGIE ")).toBe("ecologie");
    const draft = ideaFromResource(resource());
    expect(draft.body).toContain("Source déclarée");
    expect(draft.body).toContain("https://example.test/guide");
    expect(
      ideaFromResource(resource({ title: "X".repeat(180) })).title.length,
    ).toBeLessThanOrEqual(180);
  });
});
describe("Apprentissage et conservation des liens", () => {
  it("une séance et une lecture terminée ne cochent pas l’étape ; la progression est réversible", () => {
    const data = full();
    data.resources[0] = resource({ status: "done", completedAt: date });
    expect(pathProgress(data.learningPaths[0])).toEqual({
      done: 0,
      total: 2,
      percent: 0,
    });
    const done = toggleLearningStep(data, "p1", "s1");
    expect(pathProgress(done.learningPaths[0]).percent).toBe(50);
    expect(
      pathProgress(toggleLearningStep(done, "p1", "s1").learningPaths[0])
        .percent,
    ).toBe(0);
  });
  it("refuse le futur et conserve les titres déclarés au moment de la séance", () => {
    expect(() =>
      makeLearningEntry(path(), "s1", "2026-10-20", 20, "", "2026-10-19"),
    ).toThrow("future");
    expect(() =>
      makeLearningEntry(path(), "absent", "2026-10-19", 20, "", "2026-10-19"),
    ).toThrow();
    const data = full();
    const renamed = saveLearningPath(data, path({ title: "Autre titre" }));
    expect(renamed.learningEntries[0].pathTitle).toBe("Comprendre une méthode");
  });
  it("retirer une étape ou un parcours détache ses séances sans perdre les faits", () => {
    const data = full();
    const withoutStep = saveLearningPath(
      data,
      path({ steps: [path().steps[1]] }),
    );
    expect(withoutStep.learningEntries[0]).toMatchObject({
      pathId: "",
      stepId: "",
      notes: "Compris avec un essai",
    });
    const withoutPath = removeLearningPath(data, "p1");
    expect(withoutPath.learningPaths).toHaveLength(0);
    expect(withoutPath.learningEntries[0].stepTitle).toBe("Lire et essayer");
    expect(dataSchema.safeParse(withoutPath).success).toBe(true);
  });
  it("supprimer ressource, idée ou projet conserve et détache les autres éléments", () => {
    const data = full();
    data.notes = [{ id: "n1", title: "Idée", body: "", createdAt: date }];
    data.resources[0].noteIds = ["n1"];
    expect(removeNote(data, "n1").resources[0].noteIds).toEqual([]);
    const removed = removeResource(data, "r1");
    expect(removed.learningPaths[0].steps[0].resourceId).toBe("");
    expect(removed.notes).toHaveLength(1);
    data.projects = [
      {
        id: "project",
        name: "Projet",
        description: "",
        color: "sage",
        status: "active",
        createdAt: date,
      },
    ];
    data.resources[0].projectId = "project";
    data.learningPaths[0].projectId = "project";
    const withoutProject = removeProject(data, "project");
    expect(withoutProject.resources[0].projectId).toBe("");
    expect(withoutProject.learningPaths[0].projectId).toBe("");
    expect(withoutProject.learningEntries).toHaveLength(1);
  });
});
describe("Enveloppe v4", () => {
  it("migre v3 en conservant les collections antérieures et restaure v4 exactement", () => {
    const { adaptation, resources, learningPaths, learningEntries, ...legacy } =
      emptyData();
    const note = {
      id: "old",
      title: "Idée ancienne",
      body: "À garder",
      createdAt: date,
    };
    expect(
      storedDataSchema.parse({ ...legacy, version: 3, notes: [note] }),
    ).toEqual({
      ...legacy,
      version: 5,
      adaptation,
      notes: [note],
      resources,
      learningPaths,
      learningEntries,
    });
    const data = full();
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it("refuse les références orphelines et les identifiants d’étapes dupliqués", () => {
    const data = full();
    for (const patch of [
      { resources: [] },
      { learningPaths: [] },
      { learningPaths: [path({ steps: [path().steps[0], path().steps[0]] })] },
      { resources: [resource({ noteIds: ["absent"] })] },
    ])
      expect(dataSchema.safeParse({ ...data, ...patch }).success).toBe(false);
  });
  it("ne produit pas un export dépassant la limite de restauration", () => {
    const data = {
      ...emptyData(),
      notes: Array.from({ length: 1100 }, (_, index) => ({
        id: `n${index}`,
        title: "Note",
        body: "x".repeat(10000),
        createdAt: date,
      })),
    };
    expect(() => serializeBackup(data)).toThrow("10 Mo");
  });
});
