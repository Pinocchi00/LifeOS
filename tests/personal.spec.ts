import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const navigate = (page: Page, name: string) =>
  page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width < 651
          ? "Navigation mobile"
          : "Navigation principale",
      exact: true,
    })
    .getByRole("button", { name, exact: true })
    .click();
const view = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Rubriques Vie" })
    .getByRole("button", { name, exact: true })
    .click();
const food = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Cuisine et courses" })
    .getByRole("button", { name, exact: true })
    .click();
async function saved(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
  await navigate(page, "Vie");
  await expect(
    page.getByRole("group", { name: "Rubriques Vie" }),
  ).toBeVisible();
});

test("sport réel, lignes dynamiques, modification et modèle sans saisie automatique", async ({
  page,
}) => {
  await view(page, "Sport");
  await page
    .getByRole("button", { name: "Enregistrer une séance", exact: true })
    .click();
  await page.getByLabel("Nom de la séance").fill("Séance personnelle");
  await page.getByLabel("Durée réalisée (minutes)").fill("35");
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  await page.getByLabel("Exercice 1", { exact: true }).fill("Premier exercice");
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  await page.getByLabel("Exercice 2", { exact: true }).fill("Soulevé");
  await page.getByLabel("Charge 2 (kg)").fill("30");
  await page
    .getByRole("button", { name: "Retirer l’exercice 1", exact: true })
    .click();
  await expect(page.getByLabel("Exercice 1", { exact: true })).toHaveValue(
    "Soulevé",
  );
  await expect(page.getByLabel("Charge 1 (kg)")).toHaveValue("30");
  await saved(page, "Enregistrer la séance");
  await page
    .getByRole("combobox", { name: "Exercice à comparer" })
    .selectOption("Soulevé");
  await expect(page.locator(".exercise-history")).toContainText("30 kg");
  await page
    .getByRole("button", { name: "Reprendre comme modèle", exact: true })
    .click();
  await page.getByLabel("Nom de la séance").fill("Séance suivante");
  await page.getByLabel("Charge 1 (kg)").fill("35");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Garder vos modifications ?")).toBeVisible();
  await page.getByRole("button", { name: "Continuer la modification" }).click();
  await saved(page, "Enregistrer la séance");
  await expect(page.locator(".personal-record")).toHaveCount(2);
  await page
    .locator(".personal-record")
    .filter({
      has: page.getByRole("button", { name: "Séance suivante", exact: true }),
    })
    .getByRole("button", { name: "Séance suivante", exact: true })
    .click();
  await page.getByLabel("Durée réalisée (minutes)").fill("40");
  await saved(page, "Enregistrer la séance");
  await page.reload();
  await navigate(page, "Vie");
  await expect(page.locator(".personal-overview")).toContainText("75 min");
  await view(page, "Sport");
  await page
    .getByRole("button", { name: "Supprimer la séance Séance personnelle" })
    .click();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as Window & { restoreViePut?: () => void }).restoreViePut = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      if (this.transaction.db.name === "lifeos-personal")
        throw new DOMException("Échec simulé", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page
    .getByRole("button", { name: "Confirmer la suppression Vie", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "La suppression a échoué",
  );
  await page.evaluate(() =>
    (window as Window & { restoreViePut?: () => void }).restoreViePut?.(),
  );
  await saved(page, "Confirmer la suppression Vie");
  await expect(page.locator(".personal-record")).toHaveCount(1);
});

test("recette, portions, stock, courses sans doublon et repas conservé après suppression", async ({
  page,
}) => {
  await view(page, "Cuisine");
  await page.getByRole("button", { name: "Nouvelle recette" }).click();
  await page.getByLabel("Nom de la recette").fill("Riz du jour");
  await page.getByLabel("Nom de l’ingrédient 1").fill("Riz");
  await page.getByLabel("Quantité 1", { exact: true }).fill("200");
  await page.getByLabel("Unité 1").selectOption("g");
  await page
    .getByLabel("Préparation", { exact: true })
    .fill("Préparer selon ses habitudes.");
  await saved(page, "Enregistrer la recette");
  await food(page, "Mon stock");
  await page.getByRole("button", { name: "Ajouter au stock" }).click();
  await page.getByLabel("Nom de l’ingrédient", { exact: true }).fill("RIZ");
  await page.getByLabel("Quantité", { exact: true }).fill("0.05");
  await page
    .getByRole("combobox", { name: "Unité", exact: true })
    .selectOption("kg");
  await saved(page, "Enregistrer le stock");
  await food(page, "Recettes");
  await page
    .getByRole("button", { name: "Prévoir un repas", exact: true })
    .click();
  await page.getByLabel("Portions prévues").fill("4");
  await saved(page, "Prévoir ce repas");
  await food(page, "Courses");
  await page
    .getByRole("button", { name: /Compléter pour les repas prévus/ })
    .click();
  await expect(page.locator(".personal-check-row")).toHaveCount(1);
  await expect(page.locator(".personal-check-row")).toContainText("350 g");
  await expect(
    page.getByRole("button", { name: /Compléter pour les repas prévus/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Acheter Riz", exact: true }).click();
  await page.getByRole("button", { name: "Ranger les achats cochés" }).click();
  await expect(page.locator(".personal-check-row")).toHaveCount(0);
  await food(page, "Mon stock");
  await expect(page.locator(".personal-stock-row")).toContainText("0,4 kg");
  await page.getByRole("button", { name: "Repas pris", exact: true }).click();
  await expect(page.locator(".personal-meal")).toContainText("REPAS PRIS");
  await expect(page.locator(".personal-stock-row")).toContainText("0,4 kg");
  await food(page, "Recettes");
  await page
    .getByRole("button", { name: "Supprimer la recette Riz du jour" })
    .click();
  await saved(page, "Confirmer la suppression Vie");
  await expect(page.locator(".personal-meal")).toContainText("Riz du jour");
  await page
    .locator(".personal-meal")
    .getByRole("button", { name: "Riz du jour", exact: true })
    .click();
  await page.getByLabel("Portions prévues").fill("3");
  await saved(page, "Enregistrer le repas");
  await page.reload();
  await navigate(page, "Vie");
  await view(page, "Cuisine");
  await expect(page.locator(".personal-meal")).toContainText("3 portion(s)");
});

test("habitudes datées, historique en pause, nuit réelle et refus d’un réveil futur", async ({
  page,
}) => {
  await view(page, "Habitudes");
  await page.getByRole("button", { name: "Nouvelle habitude" }).click();
  await page.getByLabel("Nom de l’habitude").fill("Repère privé");
  await saved(page, "Enregistrer l’habitude");
  await page
    .getByRole("button", {
      name: "Réaliser l’habitude Repère privé",
      exact: true,
    })
    .click();
  await page.getByLabel("Jour des suivis").fill("2026-10-20");
  await expect(
    page.getByRole("button", {
      name: "Réaliser l’habitude Repère privé",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByLabel("Jour des suivis").fill("2026-10-19");
  await page
    .locator(".personal-record")
    .getByRole("button", { name: "Repère privé", exact: true })
    .click();
  await page.getByLabel("Nom de l’habitude").fill("Nouveau repère");
  await page.getByLabel("Mettre cette habitude en pause").check();
  await saved(page, "Enregistrer l’habitude");
  await expect(
    page.getByRole("button", {
      name: "Rouvrir l’habitude Repère privé du 2026-10-19",
    }),
  ).toBeVisible();
  await view(page, "Sommeil");
  await page
    .getByRole("button", { name: "Enregistrer une nuit", exact: true })
    .click();
  await page.getByLabel("Début du sommeil").fill("2026-10-18T23:00");
  await page.getByLabel("Réveil", { exact: true }).fill("2026-10-19T07:30");
  await page.getByLabel("Note personnelle").fill("Sommeil confidentiel fictif");
  await saved(page, "Enregistrer la nuit");
  await expect(page.locator(".personal-sleep-today")).toContainText(
    "8 h 30 min",
  );
  await page
    .getByRole("button", { name: "Modifier la nuit", exact: true })
    .click();
  await page.getByLabel("Réveil", { exact: true }).fill("2026-10-20T07:00");
  await page
    .getByRole("button", { name: "Enregistrer la nuit", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "réveil doit être déjà passé",
  );
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.getByRole("button", { name: "Rechercher dans LifeOS" }).click();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("Sommeil confidentiel fictif");
  await expect(page.getByText(/Aucun résultat pour/)).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.reload();
  await navigate(page, "Vie");
  await view(page, "Sommeil");
  await expect(page.locator(".personal-sleep-today")).toContainText(
    "8 h 30 min",
  );
});

test("exports distincts, restauration sélective et conservation hors ligne", async ({
  page,
  context,
}) => {
  const date = "2026-10-19T09:00:00.000Z";
  const backup = {
    application: "LifeOS-Vie",
    version: 1,
    exportedAt: date,
    sections: {
      sport: {
        workouts: [
          {
            id: "w1",
            title: "Sport confidentiel fictif",
            day: "2026-10-19",
            minutes: 20,
            notes: "",
            exercises: [],
            createdAt: date,
          },
        ],
      },
      cuisine: { recipes: [], pantry: [], shopping: [], meals: [] },
      sommeil: {
        sleep: [
          {
            id: "s1",
            wakeDay: "2026-10-19",
            start: "2026-10-18T21:00:00.000Z",
            end: "2026-10-19T05:00:00.000Z",
            quality: 3,
            notes: "Nuit confidentielle fictive",
          },
        ],
      },
    },
  };
  await page
    .getByRole("button", { name: "Sauvegarder Vie", exact: false })
    .click();
  await page.getByLabel("Restaurer une sauvegarde Vie").setInputFiles({
    name: "vie.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await saved(page, "Confirmer la restauration Vie");
  await page
    .getByRole("button", { name: "Sauvegarder Vie", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Exporter la sélection Vie" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "Cuisine, stock, repas et courses",
      exact: true,
    })
    .check();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter la sélection Vie" }).click();
  const path = await (await downloaded).path();
  const raw = await readFile(path!, "utf8");
  expect(Object.keys(JSON.parse(raw).sections)).toEqual(["cuisine"]);
  expect(raw).not.toContain("confidentiel");
  const justSport = { ...backup, sections: { sport: { workouts: [] } } };
  await page.getByLabel("Restaurer une sauvegarde Vie").setInputFiles({
    name: "sport.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(justSport)),
  });
  await saved(page, "Confirmer la restauration Vie");
  await view(page, "Sommeil");
  await expect(page.locator(".personal-sleep-today")).toContainText("8 h");
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const generalDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const generalRaw = await readFile(
    (await (await generalDownload).path())!,
    "utf8",
  );
  expect(generalRaw).not.toContain("confidentiel");
  expect(JSON.parse(generalRaw).application).toBe("LifeOS");
  expect(JSON.parse(generalRaw).data).not.toHaveProperty("sleep");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", { name: "Sauvegarder Vie", exact: false })
    .click();
  await page.getByLabel("Restaurer une sauvegarde Vie").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"application":"LifeOS-Vie","version":99}'),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Fichier Vie invalide",
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await navigate(page, "Vie");
  await view(page, "Sommeil");
  await expect(page.locator(".personal-sleep-today")).toContainText("8 h");
});
