import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData, type Task } from "../src/domain/model";
const today = "2026-10-19";
const date = "2026-10-19T10:00:00.000Z";
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Priorité forte",
  description: "",
  status: "todo",
  priority: "high",
  due: today,
  projectId: "",
  createdAt: date,
  completedAt: null,
  ...patch,
});
const openSettings = (page: Page) =>
  page
    .getByRole("button", { name: "Personnaliser LifeOS", exact: true })
    .click();
async function restore(page: Page, data: unknown) {
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
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
async function close(page: Page) {
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function changePreferences(page: Page) {
  await page
    .getByRole("button", { name: "Modifier mes réglages", exact: true })
    .click();
  await page.getByLabel("Nombre de priorités affichées").selectOption("1");
  await page
    .getByRole("combobox", { name: "Ordre des priorités", exact: true })
    .selectOption("due");
  await page
    .getByLabel("Pourquoi ce changement ?")
    .fill("Garder une échéance à la fois");
  await page
    .getByRole("button", { name: "Appliquer mes réglages", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vos repères, vos choix", exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
});
test("réglages appliqués au briefing et à la concentration, restauration tracée", async ({
  page,
}) => {
  await restore(page, {
    ...emptyData(),
    tasks: [
      task(),
      task({
        id: "old",
        title: "Échéance ancienne",
        priority: "low",
        due: "2026-10-18",
      }),
      task({ id: "future", title: "Uniquement future", due: "2026-11-01" }),
    ],
  });
  const priorities = page.locator(".priorities-panel .task-row");
  await expect(priorities).toHaveCount(2);
  await expect(priorities.first()).toContainText("Priorité forte");
  await openSettings(page);
  await changePreferences(page);
  await close(page);
  await expect(priorities).toHaveCount(1);
  await expect(priorities).toContainText("Échéance ancienne");
  await page
    .getByRole("button", { name: "Me concentrer sur cette tâche", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Échéance ancienne");
  await close(page);
  await page.reload();
  await expect(priorities).toHaveCount(1);
  await openSettings(page);
  await page
    .getByRole("button", { name: "Restaurer cette version", exact: true })
    .click();
  const confirmation = page.getByRole("region", {
    name: "Confirmation du changement",
  });
  await expect(
    confirmation.getByRole("heading", {
      name: "Revenir à ces réglages ?",
      exact: true,
    }),
  ).toBeInViewport();
  await expect(confirmation).toContainText("Priorités affichées3");
  await confirmation
    .getByRole("button", { name: "Confirmer la restauration des réglages" })
    .click();
  await expect(
    page
      .locator(".adaptation-entry")
      .filter({ hasText: "Configuration de départ" }),
  ).toHaveCount(2);
  await expect(
    page.getByText(
      "Réglages restaurés. Une nouvelle version conserve ce retour en arrière.",
    ),
  ).toBeVisible();
  await close(page);
  await expect(priorities).toHaveCount(2);
});
test("preuve visible, retour temporaire annulable et masquage explicite", async ({
  page,
}) => {
  await restore(page, { ...emptyData(), tasks: [task({ due: "2026-10-18" })] });
  const advice = page.getByRole("region", {
    name: "Conseil local",
    exact: true,
  });
  await advice.getByText("Pourquoi ce conseil ?", { exact: true }).click();
  await expect(advice).toContainText("Tâches en retard : 1");
  await expect(advice).toContainText("Les suivis Vie ne sont pas consultés.");
  await advice
    .getByRole("button", { name: "Pas aujourd’hui", exact: true })
    .click();
  await expect(advice).toContainText("Donner une place à une tâche.");
  await page.reload();
  await expect(advice).toContainText("Donner une place à une tâche.");
  await openSettings(page);
  await expect(page.getByRole("dialog")).toContainText(
    "Échéances dépassées · Pas aujourd’hui",
  );
  await page
    .getByRole("button", { name: "Annuler ce retour", exact: true })
    .click();
  await expect(
    page.getByText("Aucun retour actif pour aujourd’hui."),
  ).toBeVisible();
  await close(page);
  await expect(advice).toContainText("Revoir ce qui reste ouvert.");
  await advice.getByRole("button", { name: "Utile", exact: true }).click();
  await expect(advice).toContainText("Retour utile enregistré");
  await openSettings(page);
  await page.getByRole("button", { name: "Modifier mes réglages" }).click();
  await page.getByLabel("Échéances dépassées", { exact: true }).check();
  await page
    .getByLabel("Pourquoi ce changement ?")
    .fill("Je règle d’abord mon planning");
  await page.getByRole("button", { name: "Appliquer mes réglages" }).click();
  await close(page);
  await expect(advice).toContainText("Donner une place à une tâche.");
  await openSettings(page);
  await page.getByRole("button", { name: "Modifier mes réglages" }).click();
  await page.getByLabel("Afficher les conseils locaux").uncheck();
  await page.getByLabel("Pourquoi ce changement ?").fill("Pause des conseils");
  await page.getByRole("button", { name: "Appliquer mes réglages" }).click();
  await close(page);
  await expect(advice).toContainText(
    "Les conseils sont masqués par votre choix.",
  );
  await expect(
    advice.getByRole("button", { name: "Utile", exact: true }),
  ).toHaveCount(0);
});
test("décision relue, modifiée, export v6, restauration v4 et fonctionnement hors ligne", async ({
  page,
  context,
}) => {
  await openSettings(page);
  await changePreferences(page);
  await page
    .getByRole("button", { name: "Consigner une décision", exact: true })
    .click();
  await page.getByLabel("Titre de la décision").fill("Étudier avec régularité");
  await page
    .getByLabel("Mon choix", { exact: true })
    .fill("Une étape par semaine");
  await page.getByLabel("Contexte", { exact: true }).fill("Temps limité");
  await page.getByLabel("Raison du choix").fill("Garder un rythme tenable");
  await page.getByLabel("Date de réexamen facultative").fill(today);
  await page
    .getByRole("button", { name: "Enregistrer la décision", exact: true })
    .click();
  await page.getByLabel("Rechercher une décision").fill("etudier");
  await expect(page.locator(".decision-entry")).toContainText("À relire");
  await page
    .getByRole("button", { name: "Étudier avec régularité", exact: true })
    .click();
  await page.getByLabel("État de la décision").selectOption("reconsidered");
  await page
    .getByRole("button", { name: "Enregistrer la décision", exact: true })
    .click();
  await expect(page.locator(".decision-entry")).toContainText("Reconsidérée");
  await close(page);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const download = await downloaded;
  const path = (await download.path())!;
  const raw = JSON.parse(await readFile(path, "utf8"));
  expect(raw.data.version).toBe(6);
  expect(raw.data.adaptation.decisions[0].status).toBe("reconsidered");
  expect(raw.data.adaptation.preferences.priorityCount).toBe(1);
  expect(raw.data).not.toHaveProperty("personal");
  await close(page);
  const { githubLinks: _links, adaptation: _adaptation, ...v4 } = raw.data;
  await restore(page, { ...v4, version: 4 });
  await openSettings(page);
  await expect(
    page.getByText("Aucune décision consignée.", { exact: false }),
  ).toBeVisible();
  await close(page);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles(path);
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  // The dialog closes only after the IndexedDB restore transaction commits.
  // Replaying a cached page before that point can correctly retain the old v4 data.
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await openSettings(page);
  await expect(page.locator(".decision-entry")).toContainText(
    "Une étape par semaine",
  );
  await page
    .getByRole("button", {
      name: "Supprimer la décision Étudier avec régularité",
    })
    .click();
  await page
    .getByRole("region", { name: "Confirmation du changement" })
    .getByRole("button", { name: "Confirmer l’effacement" })
    .click();
  await expect(page.locator(".decision-entry")).toHaveCount(0);
});

test("saisie protégée, historique effacé explicitement et import incohérent refusé", async ({
  page,
}) => {
  await openSettings(page);
  await page
    .getByRole("button", { name: "Modifier mes réglages", exact: true })
    .click();
  await page.getByLabel("Pourquoi ce changement ?").fill("Brouillon conservé");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toContainText(
    "Garder vos modifications ?",
  );
  await page.getByRole("button", { name: "Continuer la modification" }).click();
  await expect(page.getByLabel("Pourquoi ce changement ?")).toHaveValue(
    "Brouillon conservé",
  );
  await page.getByRole("button", { name: "Appliquer mes réglages" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Ces réglages sont déjà appliqués.",
  );
  await page.getByLabel("Nombre de priorités affichées").selectOption("1");
  await page.getByRole("button", { name: "Appliquer mes réglages" }).click();
  await page
    .getByRole("button", { name: "Effacer les anciennes versions" })
    .click();
  const confirmation = page.getByRole("region", {
    name: "Confirmation du changement",
  });
  await confirmation
    .getByRole("button", { name: "Garder l’état actuel" })
    .click();
  await expect(
    page.getByRole("button", { name: "Restaurer cette version", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Effacer les anciennes versions" })
    .click();
  await confirmation
    .getByRole("button", { name: "Confirmer l’effacement" })
    .click();
  await expect(
    page.getByRole("button", { name: "Restaurer cette version", exact: true }),
  ).toHaveCount(0);
  await close(page);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const data = emptyData();
  data.adaptation.preferences.priorityCount = 4;
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "incoherent.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
    ),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Fichier invalide ou incompatible",
  );
  await expect(
    page.getByRole("button", {
      name: "Confirmer le remplacement",
      exact: true,
    }),
  ).toHaveCount(0);
  await close(page);
  await openSettings(page);
  await expect(
    page.locator(".preference-details").first().locator("dd").first(),
  ).toHaveText("1");
});
