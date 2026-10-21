import { describe, expect, it } from "vitest";
import {
  missionPrompt,
  missionSchema,
  safeEvidenceUrl,
  usageSchema,
  type Mission,
} from "./assistants";
import {
  dataSchema,
  emptyData,
  parseBackup,
  removeProject,
  serializeBackup,
  storedDataSchema,
} from "./model";
const date = "2026-10-19T08:00:00.000Z";
const mission = (override: Partial<Mission> = {}): Mission => ({
  id: "mission1",
  title: "Vérifier le projet",
  assistant: "claude",
  projectId: "",
  objective: "Contrôler la persistance",
  criteria: "Les données survivent au rechargement",
  files: "src/storage/database.ts",
  due: "",
  status: "todo",
  reports: [],
  createdAt: date,
  updatedAt: date,
  validatedAt: null,
  ...override,
});
describe("Missions et validation humaine", () => {
  it("refuse une mission terminée sans compte-rendu ni validation explicite", () => {
    expect(missionSchema.safeParse(mission({ status: "done" })).success).toBe(
      false,
    );
    const reports = [
      {
        id: "report1",
        body: "Test effectué",
        evidence: "Une capture locale",
        createdAt: date,
      },
    ];
    expect(
      missionSchema.safeParse(mission({ status: "done", reports })).success,
    ).toBe(false);
    expect(
      missionSchema.safeParse(
        mission({ status: "done", reports, validatedAt: date }),
      ).success,
    ).toBe(true);
    expect(
      missionSchema.safeParse(
        mission({ status: "review", reports, validatedAt: date }),
      ).success,
    ).toBe(false);
  });
  it("prépare un texte complet sans exécuter de chemin ni inventer de résultat", () => {
    const prompt = missionPrompt(mission(), "Projet local");
    expect(prompt).toContain("Assistant : Claude");
    expect(prompt).toContain("Projet local");
    expect(prompt).toContain("src/storage/database.ts");
    expect(prompt).toContain("CRITÈRES DE RÉUSSITE");
    expect(prompt).toContain("Ne pas inventer");
  });
  it("ne rend cliquables que les références web HTTP et HTTPS", () => {
    expect(safeEvidenceUrl("https://example.com/proof")).toBe(
      "https://example.com/proof",
    );
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///C:/secret",
      "src/app.ts",
    ])
      expect(safeEvidenceUrl(value)).toBeNull();
  });
  it("refuse les références de projet absentes et les identifiants de rapports dupliqués", () => {
    expect(
      dataSchema.safeParse({
        ...emptyData(),
        missions: [mission({ projectId: "absent" })],
      }).success,
    ).toBe(false);
    const reports = [
      { id: "same", body: "Test", evidence: "", createdAt: date },
    ];
    expect(
      dataSchema.safeParse({
        ...emptyData(),
        missions: [mission({ reports }), mission({ id: "mission2", reports })],
      }).success,
    ).toBe(false);
  });
});
describe("Compteurs manuels", () => {
  const usage = {
    assistant: "chatgpt",
    label: "Messages",
    used: 3,
    limit: null,
    resetAt: null,
    note: "",
    updatedAt: date,
  };
  it("accepte un plafond inconnu, refuse les nombres incohérents et les doublons", () => {
    expect(usageSchema.safeParse(usage).success).toBe(true);
    for (const patch of [{ used: -1 }, { used: 1.5 }, { limit: 0 }])
      expect(usageSchema.safeParse({ ...usage, ...patch }).success).toBe(false);
    expect(
      dataSchema.safeParse({ ...emptyData(), usage: [usage, usage] }).success,
    ).toBe(false);
  });
});
describe("Migration et sauvegarde v2", () => {
  it("importe une sauvegarde v1 sans perte et initialise uniquement les nouveaux modules", () => {
    const legacy = {
      version: 1,
      tasks: [],
      projects: [],
      notes: [
        {
          id: "n1",
          title: "À conserver",
          body: "Texte local",
          createdAt: date,
        },
      ],
    };
    const migrated = storedDataSchema.parse(legacy);
    expect(migrated.version).toBe(7);
    expect(migrated.notes).toEqual(legacy.notes);
    expect(migrated.missions).toEqual([]);
    expect(migrated.usage).toEqual([]);
    expect(
      parseBackup(
        JSON.stringify({
          application: "LifeOS",
          exportedAt: date,
          data: legacy,
        }),
      ),
    ).toEqual(migrated);
  });
  it("conserve les rapports et compteurs lors du cycle export/restauration", () => {
    const data = {
      ...emptyData(),
      missions: [
        mission({
          reports: [
            {
              id: "r1",
              body: "Résultat réel",
              evidence: "https://example.com/proof",
              createdAt: date,
            },
          ],
        }),
      ],
      usage: [
        {
          assistant: "claude" as const,
          label: "Messages",
          used: 4,
          limit: 10,
          resetAt: null,
          note: "Manuel",
          updatedAt: date,
        },
      ],
    };
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it("conserve une mission et ses rapports après suppression du projet", () => {
    const data = {
      ...emptyData(),
      projects: [
        {
          id: "p1",
          name: "Projet local",
          description: "",
          color: "sage" as const,
          status: "active" as const,
          createdAt: date,
        },
      ],
      missions: [mission({ projectId: "p1" })],
    };
    const removed = removeProject(data, "p1");
    expect(removed.missions[0].projectId).toBe("");
    expect(removed.missions).toHaveLength(1);
    expect(data.missions[0].projectId).toBe("p1");
  });
});
