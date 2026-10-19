import { expect, test, type Page } from "@playwright/test";
async function home(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
}
async function task(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
const nav = (page: Page) =>
  page.getByRole("navigation", {
    name:
      page.viewportSize()!.width < 651
        ? "Navigation mobile"
        : "Navigation principale",
    exact: true,
  });
test("concentration, passage à la suite, annulation et accès directs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  await task(page, "Première priorité");
  await task(page, "Deuxième priorité");
  await page
    .getByRole("button", { name: "Me concentrer sur cette tâche" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Première priorité", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Terminer cette tâche", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Deuxième priorité", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Rouvrir la dernière tâche" }).click();
  await expect(
    page.getByRole("heading", { name: "Première priorité", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Terminer cette tâche", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Deuxième priorité", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Terminer cette tâche", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Vos priorités sont à jour." }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Revenir à l’accueil", exact: true })
    .click();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Terminer Deuxième priorité",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Voir les tâches terminées", exact: true })
    .click();
  await expect(page.getByLabel("Filtrer les tâches")).toHaveValue("done");
  await expect(
    page.getByRole("heading", { name: "Une journée à votre rythme." }),
  ).toBeFocused();
  await nav(page).getByRole("button", { name: "Accueil", exact: true }).click();
  await page
    .getByRole("group", { name: "Espaces du jardin" })
    .getByRole("button", { name: /Projets/ })
    .click();
  await page
    .getByRole("button", { name: "Créer un projet", exact: true })
    .click();
  await expect(page.getByLabel("Nom du projet")).toBeVisible();
});
test("Échap et la fermeture protègent une saisie ; Ctrl K ne la remplace pas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await home(page);
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  await page.getByLabel("Titre", { exact: true }).fill("À ne pas perdre");
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(
    "À ne pas perdre",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByText("Garder vos modifications ?")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuer la modification" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Continuer la modification" }).click();
  await expect(page.getByLabel("Titre", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Quitter sans enregistrer" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("À ne pas perdre", { exact: true })).toHaveCount(
    0,
  );
});
test("préférence calme persistante et priorité à la réduction du mouvement système", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("experience-initialized")) {
      localStorage.setItem("lifeos-motion", "calm");
      sessionStorage.setItem("experience-initialized", "1");
    }
  });
  await home(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Suivre les préférences d’animation de l’appareil",
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(
    page.getByRole("button", {
      name: "Animations réduites par votre appareil",
    }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page
        .locator(".direction-content")
        .evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
});
test("jardin illustré sans moteur 3D, commandes et image hors ligne", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await home(page);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explorer en 3D" }),
  ).toHaveCount(0);
  await page
    .getByRole("group", { name: "Espaces du jardin" })
    .getByRole("button", { name: "Assistants" })
    .click();
  await expect(
    page.getByRole("region", { name: "Votre prochaine action" }),
  ).toContainText("Préparer une mission");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator(".garden-stage img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  expect(requests.some((url) => /gardenScene|three\./.test(url))).toBe(false);
});
