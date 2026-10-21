import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData, type Task } from "../src/domain/model";
const date = "2026-10-21T10:00:00.000Z";
const task = (patch: Partial<Task> = {}): Task => ({
  id: "past",
  title: "Relire le dossier",
  description: "Garder le contexte",
  status: "todo",
  priority: "high",
  due: "2026-10-20",
  projectId: "",
  createdAt: date,
  completedAt: null,
  schedule: { day: "2026-10-20", start: "09:00", duration: 30 },
  ...patch,
});
async function restore(page: Page, data: unknown) {
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
    ),
  });
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function open(page: Page) {
  const nav = page.getByRole("navigation", {
    name:
      page.viewportSize()!.width < 651
        ? "Navigation mobile"
        : "Navigation principale",
    exact: true,
  });
  await nav.getByRole("button", { name: "Agenda", exact: true }).click();
  await page
    .getByRole("button", { name: "Automatisations", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Automatiser avec attention",
      exact: true,
    }),
  ).toBeVisible();
}
async function close(page: Page) {
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function exportData(page: Page) {
  await page
    .getByRole("button", { name: "Ouvrir les sauvegardes", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  await close(page);
  return raw.data;
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 21, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
});
test("aperçu sans écriture, consentement, créneaux libres, sauvegarde et retour tracé", async ({
  page,
}, info) => {
  await restore(page, {
    ...emptyData(),
    tasks: [
      task(),
      task({
        id: "other",
        title: "Déjà prévu",
        schedule: { day: "2026-10-22", start: "09:00", duration: 60 },
      }),
    ],
  });
  await open(page);
  await expect(
    page.getByRole("button", { name: "Préparer l’aperçu", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /Relire le dossier/ }).check();
  await page
    .getByRole("button", { name: "Préparer l’aperçu", exact: true })
    .click();
  const preview = page.getByRole("region", { name: "Aperçu des déplacements" });
  await expect(preview).toContainText("10:00");
  await expect(preview).toContainText("Échéance conservée");
  await expect(
    page.getByRole("button", {
      name: "Appliquer ces déplacements",
      exact: true,
    }),
  ).toBeDisabled();
  await preview.screenshot({ path: info.outputPath("automation-preview.png") });
  // Leaving an uncommitted preview is protected, and discarding it writes nothing.
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.locator(".unsaved-prompt")).not.toContainText(
    "facturation",
  );
  await page
    .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
    .click();
  const before = await exportData(page);
  expect(
    before.tasks.find((item: Task) => item.id === "past").schedule.day,
  ).toBe("2026-10-20");
  expect(before.automationRuns).toEqual([]);
  await open(page);
  await page.getByRole("checkbox", { name: /Relire le dossier/ }).check();
  await page
    .getByRole("button", { name: "Préparer l’aperçu", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "J’ai relu ces déplacements et je veux les appliquer.",
    })
    .check();
  await page
    .getByRole("button", { name: "Appliquer ces déplacements", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Créneaux déplacés" }),
  ).toBeVisible();
  await close(page);
  const applied = await exportData(page);
  expect(applied.version).toBe(7);
  expect(applied.tasks.find((item: Task) => item.id === "past")).toMatchObject({
    due: "2026-10-20",
    description: "Garder le contexte",
    schedule: { day: "2026-10-22", start: "10:00", duration: 30 },
  });
  expect(applied.automationRuns).toHaveLength(1);
  await restore(page, applied);
  await page.reload();
  await open(page);
  await page
    .getByRole("button", { name: "Revenir aux anciens créneaux", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmer le retour aux anciens créneaux",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Anciens créneaux rétablis" }),
  ).toBeVisible();
  await expect(page.locator(".automation-run")).toContainText("Annulée");
  await close(page);
  const undone = await exportData(page);
  expect(
    undone.tasks.find((item: Task) => item.id === "past").schedule.day,
  ).toBe("2026-10-20");
  expect(undone.automationRuns[0].undoneAt).toBeTruthy();
});
test("place insuffisante, expiration sans écriture, sélection protégée et largeur mobile", async ({
  page,
}) => {
  await restore(page, { ...emptyData(), tasks: [task()] });
  await open(page);
  await page.getByRole("checkbox", { name: /Relire le dossier/ }).check();
  await page.getByLabel("Jusqu’à", { exact: true }).fill("09:15");
  await page
    .getByRole("button", { name: "Préparer l’aperçu", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Aperçu des déplacements" }),
  ).toContainText("Aucun créneau assez long");
  await expect(
    page.getByRole("button", {
      name: "Appliquer ces déplacements",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Revoir la sélection", exact: true })
    .click();
  await page.getByLabel("Jusqu’à", { exact: true }).fill("18:00");
  await page
    .getByRole("button", { name: "Préparer l’aperçu", exact: true })
    .click();
  await page.clock.setFixedTime(new Date(2026, 9, 21, 12, 11));
  await page
    .getByRole("checkbox", {
      name: "J’ai relu ces déplacements et je veux les appliquer.",
    })
    .check();
  await page
    .getByRole("button", { name: "Appliquer ces déplacements", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("expiré");
  await expect(
    page.getByRole("region", { name: "Journal des automatisations" }),
  ).toContainText("Aucune opération appliquée");
  const overflow = await page
    .getByRole("dialog")
    .evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  expect(overflow).toBe(false);
});
test("historique hors ligne, retour bloqué après édition, effacement confirmé conservant les tâches", async ({
  page,
  context,
}) => {
  const { prepareAutomation, applyAutomation } =
    await import("../src/domain/automations");
  const data = { ...emptyData(), tasks: [task()] };
  const now = new Date(2026, 9, 21, 12);
  const applied = applyAutomation(
    data,
    prepareAutomation(
      data,
      {
        taskIds: ["past"],
        targetDay: "2026-10-22",
        start: "09:00",
        end: "18:00",
      },
      now,
    ),
    now,
  );
  applied.tasks[0].title = "Titre relu après déplacement";
  await restore(page, applied);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await page
    .getByRole("button", { name: "Revenir aux anciens créneaux", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmer le retour aux anciens créneaux",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("modifiée ou supprimée");
  await page
    .getByRole("button", { name: "Garder en l’état", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Effacer le journal", exact: true })
    .click();
  await expect(
    page.getByRole("group", { name: "Confirmation du journal" }),
  ).toContainText("Vos tâches resteront en place");
  await page
    .getByRole("button", {
      name: "Confirmer l’effacement du journal",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Journal des automatisations" }),
  ).toContainText("Aucune opération appliquée");
  await close(page);
  const exported = await exportData(page);
  expect(exported.tasks[0]).toMatchObject({
    title: "Titre relu après déplacement",
    schedule: { day: "2026-10-22" },
  });
  expect(exported.automationRuns).toEqual([]);
});
