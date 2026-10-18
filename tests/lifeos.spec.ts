import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
});
const navigate = async (
  page: import("@playwright/test").Page,
  label: string,
) => {
  const nav = page.getByRole("navigation", {
    name:
      page.viewportSize()!.width < 651
        ? "Navigation mobile"
        : "Navigation principale",
    exact: true,
  });
  await nav.getByRole("button", { name: label, exact: true }).click();
};

test("cycle complet tâches/projets, persistance, recherche et suppression sans perte", async ({
  page,
}) => {
  await navigate(page, "Projets");
  await page
    .getByRole("button", { name: "Nouveau projet", exact: true })
    .click();
  await page.getByLabel("Nom du projet").fill("Projet de test");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Une vraie intention");
  await page.getByRole("button", { name: "Enregistrer le projet" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await navigate(page, "Agenda");
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Ma première étape");
  await page
    .getByLabel("Projet", { exact: true })
    .selectOption({ label: "Projet de test" });
  await page.getByLabel("Priorité").selectOption("high");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await navigate(page, "Agenda");
  await expect(
    page.getByText("Ma première étape", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ma première étape", exact: false })
    .filter({ has: page.locator("strong") })
    .first()
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Étape modifiée");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Terminer Étape modifiée", exact: true })
    .first()
    .click();
  await page.getByLabel("Filtrer les tâches").selectOption("done");
  await expect(
    page
      .getByRole("button", { name: "Rouvrir Étape modifiée", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rouvrir Étape modifiée", exact: true })
    .first()
    .click();
  await navigate(page, "Projets");
  await page
    .getByRole("button", { name: "Modifier Projet de test", exact: true })
    .click();
  await page.getByLabel("Nom du projet").fill("Projet renommé");
  await page.getByRole("button", { name: "Enregistrer le projet" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Supprimer le projet Projet renommé" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Rechercher dans LifeOS" }).click();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("Étape modifiée");
  await page.getByRole("button", { name: "Étape modifiée Tâche" }).click();
  await expect(page.getByLabel("Projet", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await navigate(page, "Agenda");
  await page
    .getByRole("button", { name: "Supprimer Étape modifiée", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await navigate(page, "Agenda");
  await expect(page.getByText("À chaque journée son intention.")).toBeVisible();
});

test("capture, export, restauration et refus d’un fichier dangereux", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Une idée vous traverse/ }).click();
  await page.getByLabel("Titre de l’idée").fill("<img src=x onerror=alert(1)>");
  await page.getByLabel("Votre note").fill("Une inspiration locale");
  await page.getByRole("button", { name: "Enregistrer l’idée" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const backup = await downloaded;
  const path = await backup.path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await navigate(page, "Explorer");
  await page
    .getByRole("button", {
      name: "Supprimer l’idée <img src=x onerror=alert(1)>",
    })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByText("Un endroit pour les étincelles.")).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page
    .getByLabel("Restaurer une sauvegarde JSON")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"application":"LifeOS","data":{}}'),
    });
  await expect(page.getByRole("alert")).toContainText("Fichier invalide");
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles(path!);
  await expect(
    page.getByText("Remplacer les données actuelles ?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmer le remplacement" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await navigate(page, "Explorer");
  await expect(
    page.getByRole("button", {
      name: "<img src=x onerror=alert(1)>",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".note-card img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "<img src=x onerror=alert(1)>", exact: true })
    .click();
  await page.getByLabel("Titre de l’idée").fill("Idée enrichie");
  await page.getByRole("button", { name: "Enregistrer l’idée" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Supprimer l’idée Idée enrichie" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByText("Un endroit pour les étincelles.")).toBeVisible();
});

test("navigation sans débordement et absence de faux services", async ({
  page,
}) => {
  for (const space of ["Accueil", "Agenda", "Projets", "Vie", "Explorer"]) {
    await navigate(page, space);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(
    page.getByText(/Aucune information en temps réel/),
  ).toBeVisible();
  await navigate(page, "Accueil");
  await page.screenshot({
    path: `test-results/accueil-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("hors ligne après premier chargement et protection contre deux fenêtres", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("alert")).toContainText("déjà ouvert");
  await second.close();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("Tâche hors ligne");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Tâche hors ligne", { exact: true }),
  ).toBeVisible();
});
