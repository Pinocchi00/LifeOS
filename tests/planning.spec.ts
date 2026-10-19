import { expect, test, type Page } from "@playwright/test";
const nav = (page: Page) =>
  page.getByRole("navigation", {
    name:
      page.viewportSize()!.width < 651
        ? "Navigation mobile"
        : "Navigation principale",
    exact: true,
  });
const view = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Vues de l’agenda" })
    .getByRole("button", { name, exact: true })
    .click();
async function agenda(page: Page) {
  await nav(page).getByRole("button", { name: "Agenda", exact: true }).click();
}
async function newTask(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill(title);
}
async function saveTask(page: Page) {
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 12));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
  await agenda(page);
});

test("semaine, mois, créneaux et échéances distinctes, avertissement de chevauchement", async ({
  page,
}) => {
  await newTask(page, "Session de préparation");
  await page.getByLabel("Échéance", { exact: true }).fill("2026-10-23");
  await page.getByLabel("Attribuer un créneau à cette tâche").check();
  await page.getByLabel("Jour du créneau").fill("2026-10-19");
  await page.getByLabel("Heure de début").fill("10:00");
  await page.getByLabel("Durée (minutes)").fill("60");
  await saveTask(page);
  const program = page.getByRole("region", {
    name: "Programme du jour sélectionné",
  });
  await expect(program).toContainText("10:00");
  await expect(program).toContainText("11:00");
  await newTask(page, "Deuxième créneau");
  await page.getByLabel("Échéance", { exact: true }).fill("");
  await page.getByLabel("Attribuer un créneau à cette tâche").check();
  await page.getByLabel("Jour du créneau").fill("2026-10-19");
  await page.getByLabel("Heure de début").fill("10:30");
  await page.getByLabel("Durée (minutes)").fill("60");
  await expect(
    page.getByText(/Ce créneau chevauche un autre engagement/),
  ).toBeVisible();
  await saveTask(page);
  await expect(program).toContainText("1 h 30 min RÉSERVÉES");
  await expect(program.getByText(/Des créneaux se chevauchent/)).toBeVisible();
  await page.getByRole("button", { name: "Semaine suivante" }).click();
  await expect(
    page.getByRole("button", { name: "lundi 26 octobre 2026", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Semaine précédente" }).click();
  await page
    .getByRole("button", { name: "vendredi 23 octobre 2026", exact: true })
    .click();
  await expect(
    program.getByRole("heading", { name: "Échéances de ce jour" }),
  ).toBeVisible();
  await expect(program).toContainText("Session de préparation");
  await expect(program.locator(".appointment")).toHaveCount(0);
  await view(page, "Mois");
  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(
    page.getByRole("heading", { name: "novembre 2026", exact: true }),
  ).toBeVisible();
  await page.reload();
  await agenda(page);
  await program
    .getByRole("button", { name: "Session de préparation", exact: false })
    .filter({ has: page.locator("strong") })
    .click();
  await expect(page.getByLabel("Jour du créneau")).toHaveValue("2026-10-19");
  await expect(page.getByLabel("Échéance", { exact: true })).toHaveValue(
    "2026-10-23",
  );
  await page.getByLabel("Attribuer un créneau à cette tâche").uncheck();
  await saveTask(page);
  await expect(program.locator(".appointment")).toHaveCount(1);
  await expect(program.getByText(/Des créneaux se chevauchent/)).toHaveCount(0);
});

test("routines datées, réalisation, pause et historique, export et restauration hors ligne", async ({
  page,
  context,
}) => {
  await view(page, "Routines");
  await page
    .getByRole("button", { name: "Nouvelle routine", exact: true })
    .click();
  await page.getByLabel("Nom de la routine").fill("Préparer demain");
  await page.getByLabel("Heure (facultative)", { exact: true }).fill("18:00");
  await page.getByRole("button", { name: "Enregistrer la routine" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await view(page, "Semaine");
  const program = page.getByRole("region", {
    name: "Programme du jour sélectionné",
  });
  await program
    .getByRole("button", { name: "Terminer Préparer demain", exact: true })
    .click();
  await expect(
    program.getByRole("button", {
      name: "Rouvrir Préparer demain",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Aller au jour").fill("2026-10-20");
  await expect(
    program.getByRole("button", {
      name: "Terminer Préparer demain",
      exact: true,
    }),
  ).toBeDisabled();
  await view(page, "Routines");
  await page
    .getByRole("button", { name: "Modifier la routine Préparer demain" })
    .click();
  await page.getByLabel("Nom de la routine").fill("Nouveau rythme");
  await page.getByLabel("Mettre en pause", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer la routine" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("1 réalisation(s) enregistrée(s)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rouvrir Préparer demain du 2026-10-19" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const pendingDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter mes données" }).click();
  const path = await (await pendingDownload).path();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page
    .getByRole("button", { name: "Supprimer la routine Nouveau rythme" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles(path!);
  await page.getByRole("button", { name: "Confirmer le remplacement" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await agenda(page);
  await view(page, "Routines");
  await expect(
    page.getByRole("button", { name: "Nouveau rythme", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rouvrir Préparer demain du 2026-10-19" })
    .click();
  await expect(
    page.getByText("0 réalisation(s) enregistrée(s)", { exact: true }),
  ).toBeVisible();
});

test("objectifs reliés aux tâches, progression réversible et suppression sans tâche orpheline", async ({
  page,
}) => {
  await newTask(page, "Livrer la première étape");
  await saveTask(page);
  await view(page, "Objectifs");
  await page
    .getByRole("button", { name: "Nouvel objectif", exact: true })
    .click();
  await page.getByLabel("Nom de l’objectif").fill("Préparer une sortie");
  await page
    .getByRole("checkbox", { name: /Livrer la première étape/ })
    .check();
  await page.getByRole("button", { name: "Enregistrer l’objectif" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const goal = page.locator(".goal-card");
  await expect(goal.getByRole("progressbar")).toHaveAttribute("value", "0");
  await goal.getByRole("button", { name: "Ajouter une étape" }).click();
  await page
    .getByLabel("Titre", { exact: true })
    .fill("Vérifier la seconde étape");
  await saveTask(page);
  await page
    .getByRole("button", {
      name: "Terminer Livrer la première étape",
      exact: true,
    })
    .click();
  await expect(goal.getByRole("progressbar")).toHaveAttribute("value", "50");
  await page.getByRole("button", { name: "Rechercher dans LifeOS" }).click();
  await page
    .getByRole("textbox", { name: "Rechercher", exact: true })
    .fill("Préparer une sortie");
  await page
    .getByRole("button", { name: "Préparer une sortie Objectif" })
    .click();
  await expect(page.getByLabel("Nom de l’objectif")).toHaveValue(
    "Préparer une sortie",
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByLabel("Filtrer les tâches").selectOption("done");
  await page
    .getByRole("button", {
      name: "Rouvrir Livrer la première étape",
      exact: true,
    })
    .click();
  await expect(goal.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page.getByLabel("Filtrer les tâches").selectOption("open");
  await page
    .getByRole("button", {
      name: "Supprimer Livrer la première étape",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(goal).toContainText("0 / 1 étape(s)");
  await page.reload();
  await agenda(page);
  await view(page, "Objectifs");
  await expect(goal).toContainText("0 / 1 étape(s)");
  await goal
    .getByRole("button", { name: "Supprimer l’objectif Préparer une sortie" })
    .click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Terminer Vérifier la seconde étape",
      exact: true,
    }),
  ).toBeVisible();
});
