import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData, type Task } from "../src/domain/model";
const date = "2026-10-21T10:00:00.000Z";
const core = (title: string) =>
  JSON.stringify({
    application: "LifeOS",
    exportedAt: date,
    data: {
      ...emptyData(),
      notes: [{ id: "note", title, body: "Conservé", createdAt: date }],
    },
  });
const vie = (title: string) =>
  JSON.stringify({
    application: "LifeOS-Vie",
    version: 1,
    exportedAt: date,
    sections: {
      sport: {
        workouts: [
          {
            id: "workout",
            title,
            day: "2026-10-21",
            minutes: 20,
            notes: "",
            exercises: [],
            createdAt: date,
          },
        ],
      },
    },
  });
const file = (name: string, raw: string) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(raw),
});
async function restore(page: Page, raw: string) {
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  await page
    .getByLabel("Restaurer une sauvegarde JSON")
    .setInputFiles(file("fixture.json", raw));
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function exportCore(page: Page) {
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = await readFile((await (await downloaded).path())!, "utf8");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  return raw;
}
async function holdReads(page: Page) {
  await page.evaluate(() => {
    const original = File.prototype.text;
    const pending = new Map<string, () => Promise<void>>();
    Object.assign(window, { backupReads: pending });
    File.prototype.text = function () {
      const file = this;
      return new Promise((resolve, reject) => {
        pending.set(file.name, () => original.call(file).then(resolve, reject));
      });
    };
  });
}
async function release(page: Page, name: string) {
  await page.evaluate(async (key) => {
    await (
      window as unknown as { backupReads: Map<string, () => Promise<void>> }
    ).backupReads.get(key)!();
  }, name);
  // A task boundary lets the captured asynchronous read and React update finish.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}
async function navigateVie(page: Page) {
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width < 651
          ? "Navigation mobile"
          : "Navigation principale",
      exact: true,
    })
    .getByRole("button", { name: "Vie", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sauvegarder Vie", exact: false })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 21, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
});
test("l’export attend la transaction en cours et inclut sa modification", async ({
  page,
}) => {
  const data = emptyData();
  data.tasks = [
    {
      id: "queued",
      title: "Écriture en attente",
      description: "",
      status: "todo",
      priority: "high",
      due: "",
      projectId: "",
      createdAt: date,
      completedAt: null,
    },
  ];
  await restore(
    page,
    JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("lifeos-core", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction("state", "readwrite");
          let held = true;
          Object.assign(window, {
            releaseBackupWrite: () => {
              held = false;
            },
          });
          const keepAlive = () => {
            const read = transaction.objectStore("state").get("current");
            read.onsuccess = () => {
              if (held) keepAlive();
            };
          };
          transaction.oncomplete = () => db.close();
          keepAlive();
          resolve();
        };
      }),
  );
  await page
    .getByRole("button", { name: "Terminer Écriture en attente", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  const exportButton = page.getByRole("button", {
    name: "Exporter mes données",
    exact: true,
  });
  await expect(exportButton).toBeDisabled();
  await expect(page.getByRole("dialog")).toContainText(
    "après les dernières écritures",
  );
  await page.evaluate(() =>
    (
      window as unknown as { releaseBackupWrite: () => void }
    ).releaseBackupWrite(),
  );
  await expect(exportButton).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await exportButton.click();
  const exported = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(exported.data.tasks[0].status).toBe("done");
  expect(exported.data.tasks[0].completedAt).toBeTruthy();
});
test("le dernier fichier choisi reste seul restaurable si les lectures finissent à l’envers", async ({
  page,
}) => {
  await holdReads(page);
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  const input = page.getByLabel("Restaurer une sauvegarde JSON");
  await input.setInputFiles(file("first.json", core("Premier fichier")));
  await expect(
    page.getByText("Lecture de la sauvegarde…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exporter mes données", exact: true }),
  ).toBeDisabled();
  await input.setInputFiles(file("last.json", core("Dernier fichier choisi")));
  await release(page, "last.json");
  await expect(
    page.getByRole("button", {
      name: "Confirmer le remplacement",
      exact: true,
    }),
  ).toBeVisible();
  await release(page, "first.json");
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(JSON.parse(await exportCore(page)).data.notes[0].title).toBe(
    "Dernier fichier choisi",
  );
});
test("annulation et nouveau fichier invalide ne ressuscitent pas un ancien aperçu", async ({
  page,
}) => {
  await restore(page, core("Données initiales"));
  await holdReads(page);
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  const input = page.getByLabel("Restaurer une sauvegarde JSON");
  await input.setInputFiles(file("cancelled.json", core("À ignorer")));
  await page
    .getByRole("button", { name: "Annuler la restauration", exact: true })
    .click();
  await release(page, "cancelled.json");
  await expect(
    page.getByRole("button", {
      name: "Confirmer le remplacement",
      exact: true,
    }),
  ).toHaveCount(0);
  await input.setInputFiles(file("old.json", core("Ancien aperçu")));
  await input.setInputFiles(file("invalid.json", "{}"));
  await release(page, "invalid.json");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Fichier invalide",
  );
  await release(page, "old.json");
  await expect(
    page.getByRole("button", {
      name: "Confirmer le remplacement",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  expect(JSON.parse(await exportCore(page)).data.notes[0].title).toBe(
    "Données initiales",
  );
});
test("Vie protège aussi le dernier fichier et la sélection de rubriques après annulation", async ({
  page,
}) => {
  await holdReads(page);
  await navigateVie(page);
  const input = page.getByLabel("Restaurer une sauvegarde Vie");
  await input.setInputFiles(file("vie-cancelled.json", vie("Séance annulée")));
  await page
    .getByRole("button", { name: "Annuler la restauration Vie", exact: true })
    .click();
  await release(page, "vie-cancelled.json");
  await expect(
    page.getByRole("button", {
      name: "Confirmer la restauration Vie",
      exact: true,
    }),
  ).toHaveCount(0);
  await input.setInputFiles(file("vie-old.json", vie("Ancienne séance")));
  await input.setInputFiles(
    file("vie-last.json", vie("Dernière séance choisie")),
  );
  await release(page, "vie-last.json");
  await expect(
    page.getByRole("button", {
      name: "Confirmer la restauration Vie",
      exact: true,
    }),
  ).toBeEnabled();
  await release(page, "vie-old.json");
  await page
    .getByRole("button", { name: "Confirmer la restauration Vie", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Sauvegarder Vie", exact: false })
    .click();
  await page
    .getByRole("group", { name: "Rubriques à exporter", exact: true })
    .getByRole("checkbox", { name: "Sport", exact: true })
    .check();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter la sélection Vie" }).click();
  const raw = JSON.parse(
    await readFile((await (await downloaded).path())!, "utf8"),
  );
  expect(raw.sections.sport.workouts[0].title).toBe("Dernière séance choisie");
});
test("un échec de transaction conserve l’ancienne sauvegarde et permet une nouvelle tentative", async ({
  page,
}) => {
  await restore(page, core("À conserver"));
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  await page
    .getByLabel("Restaurer une sauvegarde JSON")
    .setInputFiles(file("replace.json", core("Remplacement attendu")));
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      IDBObjectStore.prototype.put = original;
      const request = original.call(this, value, key);
      this.transaction.abort();
      return request;
    };
  });
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "données actuelles sont conservées",
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.reload();
  expect(JSON.parse(await exportCore(page)).data.notes[0].title).toBe(
    "À conserver",
  );
  await restore(page, core("Remplacement attendu"));
  expect(JSON.parse(await exportCore(page)).data.notes[0].title).toBe(
    "Remplacement attendu",
  );
});
test("vingt mille tâches restent exportables, restaurables et persistantes hors ligne", async ({
  page,
  context,
}) => {
  const data = emptyData();
  data.tasks = Array.from({ length: 20_000 }, (_, index): Task => ({
    id: `task-${index}`,
    title: `Tâche ${index}`,
    description: "Contexte ".repeat(28).trim(),
    status: "todo",
    priority: "medium",
    due: "",
    projectId: "",
    createdAt: date,
    completedAt: null,
  }));
  await restore(
    page,
    JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
  );
  const exported = await exportCore(page);
  expect(Buffer.byteLength(exported)).toBeLessThanOrEqual(10 * 1024 * 1024);
  expect(JSON.parse(exported).data.tasks).toEqual(data.tasks);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  expect(JSON.parse(await exportCore(page)).data.tasks).toHaveLength(20_000);
});
