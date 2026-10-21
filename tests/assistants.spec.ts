import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function projects(page: Page) {
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width < 651
          ? "Navigation mobile"
          : "Navigation principale",
      exact: true,
    })
    .getByRole("button", { name: "Projets", exact: true })
    .click();
}
async function center(page: Page) {
  await projects(page);
  await page.getByRole("button", { name: /^Missions IA/ }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
});
test("mission complète, instructions, rapports, validation, filtres et projet supprimé", async ({
  page,
}) => {
  await projects(page);
  await page
    .getByRole("button", { name: "Nouveau projet", exact: true })
    .click();
  await page.getByLabel("Nom du projet").fill("Projet vérifiable");
  await page.getByRole("button", { name: "Enregistrer le projet" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await center(page);
  await page
    .getByRole("button", { name: "Nouvelle mission", exact: true })
    .click();
  await page.getByLabel("Titre de la mission").fill("Vérifier les données");
  await page
    .getByLabel("Objectif", { exact: true })
    .fill("Tester la conservation locale");
  await page
    .getByLabel("Critères de réussite")
    .fill("Rechargement sans perte\nExport lisible");
  await page.getByLabel("Fichiers concernés").fill("src/storage/database.ts");
  await page
    .getByRole("combobox", { name: "Projet de la mission", exact: true })
    .selectOption({ label: "Projet vérifiable" });
  await page.getByRole("button", { name: "Enregistrer la mission" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Instructions pour Vérifier les données" })
    .click();
  await expect(page.getByLabel("Instructions préparées")).toContainText(
    "CRITÈRES DE RÉUSSITE",
  );
  await expect(page.getByLabel("Instructions préparées")).toContainText(
    "Projet vérifiable",
  );
  await expect(page.getByLabel("Instructions préparées")).toContainText(
    "src/storage/database.ts",
  );
  await page.getByRole("button", { name: "Copier les instructions" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /copiées|sélectionné/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", { name: "Modifier la mission Vérifier les données" })
    .click();
  await page
    .getByRole("combobox", { name: "Statut de la mission", exact: true })
    .selectOption("done");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enregistrer la mission" }).click();
  await expect(page.getByRole("alert")).toContainText("compte-rendu");
  await page
    .getByLabel("Nouveau compte-rendu")
    .fill("Vérifications réellement effectuées dans ce test.");
  await page
    .getByLabel("Preuves et références")
    .fill("javascript:alert(1)\nhttps://example.com/proof");
  await page
    .getByRole("combobox", { name: "Statut de la mission", exact: true })
    .selectOption("review");
  await page.getByRole("button", { name: "Enregistrer la mission" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".mission-status")).toHaveText("À vérifier");
  await page.reload();
  await center(page);
  await page
    .getByRole("button", { name: "Modifier la mission Vérifier les données" })
    .click();
  await expect(
    page.getByText("Vérifications réellement effectuées dans ce test.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".report-history a")).toHaveCount(1);
  await expect(page.locator(".report-history a")).toHaveAttribute(
    "href",
    "https://example.com/proof",
  );
  await page
    .getByRole("combobox", { name: "Statut de la mission", exact: true })
    .selectOption("done");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enregistrer la mission" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".mission-status")).toHaveText("Terminé");
  await page.getByLabel("Filtrer par assistant").selectOption("claude");
  await expect(
    page.getByText("Aucune mission pour ces filtres."),
  ).toBeVisible();
  await page.getByLabel("Filtrer par assistant").selectOption("all");
  await page.getByLabel("Filtrer les missions par statut").selectOption("done");
  await expect(
    page.getByRole("button", {
      name: "Modifier la mission Vérifier les données",
    }),
  ).toBeVisible();
  await projects(page);
  await page
    .getByRole("button", { name: "Supprimer le projet Projet vérifiable" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Rechercher dans LifeOS" }).click();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("Vérifier les données");
  await page
    .getByRole("button", { name: "Vérifier les données Mission" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Projet de la mission", exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await center(page);
  await page
    .getByRole("button", { name: "Supprimer la mission Vérifier les données" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(
    page.getByText("Donnez une intention à vos assistants."),
  ).toBeVisible();
});
test("compteurs manuels persistants, export v7 et restauration de sauvegarde v1", async ({
  page,
}) => {
  await center(page);
  await page
    .getByRole("button", { name: "Régler le compteur ChatGPT" })
    .click();
  await page.getByLabel("Usage relevé").fill("4");
  await page.getByRole("button", { name: "Enregistrer le compteur" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("plafond inconnu", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Régler le compteur ChatGPT" })
    .click();
  await page.getByLabel("Plafond connu").fill("10");
  await page
    .getByLabel("Prochaine remise à zéro prévue")
    .fill("2000-01-01T12:00");
  await page.getByRole("button", { name: "Enregistrer le compteur" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await center(page);
  await expect(page.getByText("6 restant(s) selon votre saisie")).toBeVisible();
  await expect(page.getByText(/Échéance passée/)).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const file = await download;
  const content = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(content.data.version).toBe(7);
  expect(content.data.usage[0].used).toBe(4);
  expect(content.data.usage[0].limit).toBe(10);
  const legacy = {
    application: "LifeOS",
    exportedAt: new Date().toISOString(),
    data: {
      version: 1,
      tasks: [],
      projects: [],
      notes: [
        {
          id: "old-note",
          title: "Idée conservée depuis v1",
          body: "Une sauvegarde compatible",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  };
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page.getByRole("button", { name: "Confirmer le remplacement" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width < 651
          ? "Navigation mobile"
          : "Navigation principale",
      exact: true,
    })
    .getByRole("button", { name: "Explorer", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Rubriques Explorer" })
    .getByRole("button", { name: "Idées", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Idée conservée depuis v1", exact: true }),
  ).toBeVisible();
});
