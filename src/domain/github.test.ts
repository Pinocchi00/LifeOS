import { describe, expect, it } from "vitest";
import {
  emptyData,
  dataSchema,
  storedDataSchema,
  serializeBackup,
  parseBackup,
} from "./model";
import { changePreferences } from "./adaptation";
import {
  addGithubLink,
  appendGithubCheck,
  clearGithubChecks,
  githubCheckLabel,
  removeGithubLink,
  removeMission,
} from "./github";
import {
  githubCheckSchema,
  githubUrl,
  parseGithubUrl,
  type GithubCheck,
} from "./githubSchema";
import type { Mission } from "./assistants";
const date = "2026-10-19T12:00:00.000Z";
const mission = (id = "m1"): Mission => ({
  id,
  title: "Vérifier une livraison",
  assistant: "chatgpt",
  projectId: "",
  objective: "Vérifier les critères",
  criteria: "Données conservées",
  files: "",
  due: "",
  status: "review",
  reports: [],
  createdAt: date,
  updatedAt: date,
  validatedAt: null,
});
const initial = () => ({ ...emptyData(), missions: [mission()] });
const check = (): Extract<GithubCheck, { kind: "pull" }> => ({
  id: crypto.randomUUID(),
  kind: "pull",
  checkedAt: date,
  title: "Un changement public",
  remoteUpdatedAt: date,
  state: "closed",
  merged: true,
  draft: false,
  headSha: "a".repeat(40),
});
describe("Liens GitHub publics et référencés", () => {
  it("normalise les liens sans ambiguïté et construit une adresse sûre", () => {
    const value = parseGithubUrl(" https://github.com/Auteur/Depot/pull/12/ ");
    expect(value).toEqual({
      owner: "auteur",
      repo: "depot",
      kind: "pull",
      number: 12,
    });
    expect(githubUrl(value)).toBe("https://github.com/auteur/depot/pull/12");
    expect(parseGithubUrl("https://github.com/a/b/actions/runs/23").kind).toBe(
      "run",
    );
    expect(parseGithubUrl("https://github.com/a/b/issues/1").kind).toBe(
      "issue",
    );
  });
  it.each([
    "http://github.com/a/b/pull/1",
    "https://github.com.evil.test/a/b/pull/1",
    "https://name:secret@github.com/a/b/pull/1",
    "https://github.com/a/b/pull/1?token=secret",
    "https://github.com/a/b/pull/1#secret",
    "https://github.com:444/a/b/pull/1",
    "https://github.com/a/b/pull/0",
    "https://github.com/a/b/pull/9007199254740993",
    "https://github.com/a/b/pull/01",
    "https://github.com/a/b/pull/%31",
    "https://github.com/a/b/tree/main",
    "javascript:alert(1)",
  ])("refuse les adresses ambiguës ou contenant des secrets : %s", (url) =>
    expect(() => parseGithubUrl(url)).toThrow(),
  );
  it("relie localement, refuse les doublons par mission et la limite, conserve la validation manuelle", () => {
    const before = initial();
    let data = addGithubLink(before, "m1", "https://github.com/a/b/pull/1");
    expect(data.missions).toEqual(before.missions);
    expect(data.githubLinks[0].checks).toEqual([]);
    expect(before.githubLinks).toEqual([]);
    expect(() =>
      addGithubLink(data, "m1", "https://github.com/A/B/pull/1/"),
    ).toThrow("déjà");
    for (let number = 2; number <= 10; number++)
      data = addGithubLink(data, "m1", `https://github.com/a/b/pull/${number}`);
    expect(() =>
      addGithubLink(data, "m1", "https://github.com/a/b/pull/11"),
    ).toThrow("Limite");
    expect(() =>
      addGithubLink(data, "absent", "https://github.com/a/b/pull/1"),
    ).toThrow("plus");
    const other = addGithubLink(
      { ...data, missions: [...data.missions, mission("m2")] },
      "m2",
      "https://github.com/a/b/pull/1",
    );
    expect(other.githubLinks).toHaveLength(11);
  });
  it("conserve vingt instantanés sans effacement implicite ; libère l’historique explicitement", () => {
    let data = addGithubLink(initial(), "m1", "https://github.com/a/b/pull/1");
    const id = data.githubLinks[0].id;
    for (let i = 0; i < 20; i++) data = appendGithubCheck(data, id, check());
    expect(dataSchema.safeParse(data).success).toBe(true);
    expect(() => appendGithubCheck(data, id, check())).toThrow("20 relevés");
    const cleared = clearGithubChecks(data, id);
    expect(cleared.githubLinks[0].checks).toEqual(
      data.githubLinks[0].checks.slice(-1),
    );
    expect(data.githubLinks[0].checks).toHaveLength(20);
    expect(
      appendGithubCheck(cleared, id, check()).githubLinks[0].checks,
    ).toHaveLength(2);
    expect(cleared.missions[0].status).toBe("review");
  });
  it("retire les relevés avec leur lien ou mission, sans référence orpheline", () => {
    const linked = addGithubLink(
      initial(),
      "m1",
      "https://github.com/a/b/pull/1",
    );
    const id = linked.githubLinks[0].id;
    const data = appendGithubCheck(linked, id, check());
    expect(removeGithubLink(data, id).missions).toEqual(data.missions);
    const removed = removeMission(data, "m1");
    expect(removed.githubLinks).toEqual([]);
    expect(dataSchema.safeParse(removed).success).toBe(true);
    expect(() => appendGithubCheck(removed, id, check())).toThrow("plus");
  });
  it("refuse les liens orphelins, les doublons d’identifiants, les relevés mal associés et les secrets", () => {
    const data = addGithubLink(
      initial(),
      "m1",
      "https://github.com/a/b/pull/1",
    );
    const link = data.githubLinks[0];
    for (const patch of [
      { missionId: "absent" },
      { id: "m1" },
      { token: "secret" },
      { checks: [{ ...check(), kind: "issue" }] },
    ])
      expect(
        dataSchema.safeParse({ ...data, githubLinks: [{ ...link, ...patch }] })
          .success,
      ).toBe(false);
    expect(
      dataSchema.safeParse({
        ...data,
        githubLinks: [link, { ...link, id: "other" }],
      }).success,
    ).toBe(false);
    expect(
      githubCheckSchema.safeParse({ ...check(), state: "open" }).success,
    ).toBe(false);
  });
  it("différencie fermeture, fusion, brouillon, conclusion absente et statut futur", () => {
    expect(githubCheckLabel(check())).toContain("fusionnée");
    expect(
      githubCheckLabel({
        ...check(),
        kind: "pull",
        merged: false,
        state: "closed",
        draft: false,
      }),
    ).toContain("non fusionnée");
    expect(
      githubCheckLabel({
        ...check(),
        kind: "pull",
        merged: false,
        state: "open",
        draft: true,
      }),
    ).toContain("brouillon");
    const run: GithubCheck = {
      id: "run",
      kind: "run",
      title: "Tests",
      checkedAt: date,
      remoteUpdatedAt: date,
      headSha: "a".repeat(40),
      attempt: 2,
      status: "completed",
      conclusion: null,
    };
    expect(githubCheckLabel(run)).toContain("absente");
    expect(githubCheckLabel({ ...run, status: "new_status" })).toContain(
      "non reconnu",
    );
    expect(githubCheckLabel({ ...run, conclusion: "skipped" })).toBe("Ignorée");
  });
  it("migre v5 sans réinitialiser les préférences, et restaure v6 avec tous les relevés", () => {
    let data = changePreferences(
      initial(),
      { ...emptyData().adaptation.preferences, priorityCount: 1 },
      "Une seule priorité",
    );
    const { githubLinks: _links, ...v5 } = data;
    expect(storedDataSchema.parse({ ...v5, version: 5 })).toEqual(data);
    data = addGithubLink(data, "m1", "https://github.com/a/b/pull/1");
    data = appendGithubCheck(data, data.githubLinks[0].id, check());
    expect(parseBackup(serializeBackup(data))).toEqual(data);
    expect(JSON.parse(serializeBackup(data)).data).not.toHaveProperty(
      "personal",
    );
    expect(JSON.parse(serializeBackup(data)).data.version).toBe(6);
  });
});
