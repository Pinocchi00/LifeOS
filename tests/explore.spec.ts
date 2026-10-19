import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const nav = (page: Page, name: string) =>
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
    .getByRole("group", { name: "Rubriques Explorer" })
    .getByRole("button", { name, exact: true })
    .click();
async function saved(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function resource(page: Page, title = "Écologie appliquée") {
  await view(page, "Ressources");
  await page
    .getByRole("button", { name: "Nouvelle ressource", exact: true })
    .click();
  await page.getByLabel("Titre de la ressource").fill(title);
  await page
    .getByLabel("Auteur ou organisme source")
    .fill("Atelier documentaire");
  await page.getByLabel("Lien de la source").fill("https://example.test/guide");
  await page
    .getByLabel("Ce que je retiens", { exact: true })
    .fill("Une méthode à essayer.");
  await page
    .getByLabel("Thèmes (séparés par une virgule)")
    .fill("Écologie, Méthodes");
  await saved(page, "Enregistrer la ressource");
}
async function learningPath(page: Page) {
  await view(page, "Apprendre");
  await page
    .getByRole("button", { name: "Nouveau parcours", exact: true })
    .click();
  await page.getByLabel("Nom du parcours").fill("Comprendre et transmettre");
  await page.getByLabel("Étape 1", { exact: true }).fill("Lire et essayer");
  await page
    .getByRole("combobox", { name: "Ressource de l’étape 1" })
    .selectOption({ label: "Écologie appliquée" });
  await page
    .getByRole("button", { name: "Ajouter une étape", exact: true })
    .click();
  await page
    .getByLabel("Étape 2", { exact: true })
    .fill("Expliquer avec mes mots");
  await saved(page, "Enregistrer le parcours");
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
  await nav(page, "Explorer");
  await expect(
    page.getByRole("group", { name: "Rubriques Explorer" }),
  ).toBeVisible();
});
test("source retrouvable, thèmes, lecture, actualité datée et idée reliée", async ({
  page,
}) => {
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("example.test"))
      remoteRequests.push(request.url());
  });
  await resource(page);
  const card = page
    .locator(".resource-card")
    .filter({
      has: page.getByRole("button", {
        name: "Écologie appliquée",
        exact: true,
      }),
    });
  await expect(
    card.getByRole("link", { name: "Ouvrir la source" }),
  ).toHaveAttribute("href", "https://example.test/guide");
  await expect(
    card.getByRole("link", { name: "Ouvrir la source" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByLabel("Rechercher une ressource").fill("ecologie");
  await expect(card).toBeVisible();
  await page.getByLabel("Rechercher une ressource").fill("");
  await card
    .getByRole("button", { name: "Ajouter aux favoris Écologie appliquée" })
    .click();
  await card
    .getByRole("button", { name: "Marquer comme consultée Écologie appliquée" })
    .click();
  await page
    .getByRole("combobox", { name: "Filtrer les lectures" })
    .selectOption("saved");
  await expect(page.locator(".resource-card")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filtrer les lectures" })
    .selectOption("all");
  await page
    .getByRole("button", { name: "Nouvelle ressource", exact: true })
    .click();
  await page.getByLabel("Titre de la ressource").fill("Veille enregistrée");
  await page.getByLabel("Auteur ou organisme source").fill("Source saisie");
  await page
    .getByLabel("Lien de la source")
    .fill("https://example.test/guide#nouvelle");
  await expect(page.getByText(/Ce lien est déjà associé/)).toBeVisible();
  await page
    .getByRole("combobox", { name: "Format", exact: true })
    .selectOption("news");
  await page
    .getByRole("button", { name: "Enregistrer la ressource", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Publié le (obligatoire)").fill("2026-10-18");
  await saved(page, "Enregistrer la ressource");
  await page.getByText("Affiner la bibliothèque", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Filtrer les formats" })
    .selectOption("news");
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await expect(page.locator(".resource-card")).toContainText("18 oct. 2026");
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await card.getByText("Idées reliées · 0", { exact: true }).click();
  await card
    .getByRole("button", { name: "Capturer une idée depuis cette source" })
    .click();
  await expect(page.getByLabel("Votre note")).toHaveValue(
    /https:\/\/example.test\/guide/,
  );
  await page.getByLabel("Titre de l’idée").fill("Idée issue de la source");
  await saved(page, "Enregistrer l’idée");
  await expect(
    card.getByText("Idées reliées · 1", { exact: true }),
  ).toBeVisible();
  await nav(page, "Accueil");
  await page
    .getByRole("button", { name: "Retrouver les idées capturées" })
    .click();
  await expect(
    page.getByRole("button", { name: "Idée issue de la source", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Supprimer l’idée Idée issue de la source" })
    .click();
  await saved(page, "Confirmer la suppression");
  await view(page, "Ressources");
  await expect(
    card.getByText("Idées reliées · 0", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Rechercher dans LifeOS" }).click();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("ecologie");
  await page
    .getByRole("button", { name: "Écologie appliquée Ressource", exact: true })
    .click();
  await expect(page.getByLabel("Titre de la ressource")).toHaveValue(
    "Écologie appliquée",
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  expect(remoteRequests).toEqual([]);
});
test("apprentissage déclaré, progression réversible et historique après retrait", async ({
  page,
}) => {
  await resource(page);
  await learningPath(page);
  const card = page.locator(".learning-card");
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "0");
  await card
    .getByRole("button", { name: "Noter une séance", exact: false })
    .first()
    .click();
  await page.getByLabel("Temps réellement consacré (minutes)").fill("25");
  await page
    .getByLabel("Ce que j’ai appris ou essayé")
    .fill("Une explication avec un exemple réel.");
  await saved(page, "Enregistrer la séance d’apprentissage");
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "0");
  await card
    .getByRole("button", { name: "Écologie appliquée", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "État de lecture" })
    .selectOption("done");
  await saved(page, "Enregistrer la ressource");
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "0");
  await card
    .getByRole("button", {
      name: "Terminer l’étape Lire et essayer",
      exact: true,
    })
    .click();
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "50");
  await card
    .getByRole("button", {
      name: "Terminer l’étape Expliquer avec mes mots",
      exact: true,
    })
    .click();
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "100");
  await card
    .getByRole("button", {
      name: "Rouvrir l’étape Lire et essayer",
      exact: true,
    })
    .click();
  await expect(card.getByRole("progressbar")).toHaveAttribute("value", "50");
  await card
    .getByRole("button", { name: "Modifier le parcours", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retirer l’étape 1", exact: true })
    .click();
  await expect(page.getByLabel("Étape 1", { exact: true })).toHaveValue(
    "Expliquer avec mes mots",
  );
  await saved(page, "Enregistrer le parcours");
  await expect(page.locator(".learning-entry")).toContainText(
    "Étape détachée, historique conservé",
  );
  await expect(page.locator(".learning-entry")).toContainText(
    "Une explication avec un exemple réel.",
  );
  await card
    .getByRole("button", {
      name: "Supprimer le parcours Comprendre et transmettre",
    })
    .click();
  await saved(page, "Confirmer la suppression");
  await expect(card).toHaveCount(0);
  await expect(page.locator(".learning-entry")).toHaveCount(1);
  await page
    .locator(".learning-entry")
    .getByRole("button", { name: "Lire et essayer", exact: true })
    .click();
  await page.getByLabel("Jour de la séance").fill("2026-10-20");
  await page
    .getByRole("button", { name: "Enregistrer la séance d’apprentissage" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Jour de la séance").fill("2026-10-19");
  await page.getByLabel("Temps réellement consacré (minutes)").fill("30");
  await saved(page, "Enregistrer la séance d’apprentissage");
  await page.reload();
  await nav(page, "Explorer");
  await view(page, "Apprendre");
  await expect(page.locator(".learning-entry")).toContainText(
    "30 MIN DÉCLARÉES",
  );
});
test("sauvegarde v4, restauration des liens, import v3 et bibliothèque hors ligne", async ({
  page,
  context,
}) => {
  await resource(page);
  await learningPath(page);
  await page
    .getByRole("button", { name: "Noter une séance", exact: false })
    .first()
    .click();
  await saved(page, "Enregistrer la séance d’apprentissage");
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const path = await (await downloaded).path();
  const raw = JSON.parse(await readFile(path!, "utf8"));
  expect(raw.data.version).toBe(4);
  expect(raw.data.learningEntries).toHaveLength(1);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await view(page, "Ressources");
  await page
    .getByRole("button", { name: "Supprimer la ressource Écologie appliquée" })
    .click();
  await saved(page, "Confirmer la suppression");
  await view(page, "Apprendre");
  await expect(page.locator(".learning-source")).toHaveCount(0);
  await expect(page.locator(".learning-entry")).toHaveCount(1);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const invalid = structuredClone(raw);
  invalid.data.resources[0].url = "javascript:alert(1)";
  await page
    .getByLabel("Restaurer une sauvegarde JSON")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalid)),
    });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Fichier invalide",
  );
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles(path!);
  await saved(page, "Confirmer le remplacement");
  await expect(page.locator(".learning-source")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await nav(page, "Explorer");
  await expect(page.locator(".resource-card")).toContainText(
    "Écologie appliquée",
  );
  await view(page, "Apprendre");
  await expect(page.locator(".learning-entry")).toHaveCount(1);
  const legacy = {
    application: "LifeOS",
    exportedAt: "2026-10-19T10:00:00.000Z",
    data: {
      version: 3,
      tasks: [],
      projects: [],
      notes: [
        {
          id: "legacy-note",
          title: "Idée conservée de v3",
          body: "Texte ancien",
          createdAt: "2026-10-19T10:00:00.000Z",
        },
      ],
      missions: [],
      usage: [],
      routines: [],
      routineEntries: [],
      goals: [],
    },
  };
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page
    .getByLabel("Restaurer une sauvegarde JSON")
    .setInputFiles({
      name: "v3.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await saved(page, "Confirmer le remplacement");
  await view(page, "Idées");
  await expect(
    page.getByRole("button", { name: "Idée conservée de v3", exact: true }),
  ).toBeVisible();
});
