import { expect, test, type Page } from "@playwright/test";
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});
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
    .getByRole("group", { name: "Terrasses du jardin" })
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
  await expect(page.locator(".garden-stage")).toHaveAttribute(
    "data-scene-state",
    "photo",
  );
  await expect(page.locator(".garden-canvas canvas")).toHaveCount(0);
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
test("vraie 3D, rendu au repos, cache hors ligne et libération à la navigation", async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  await page.addInitScript(() => localStorage.setItem("lifeos-motion", "calm"));
  await home(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  expect(
    await page.evaluate(async () => {
      const names = await caches.keys();
      const urls = (
        await Promise.all(
          names.map(async (name) =>
            (await (await caches.open(name)).keys()).map(
              (request) => request.url,
            ),
          ),
        )
      ).flat();
      return urls.some((url) => url.includes("gardenScene-"));
    }),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Explorer en 3D", exact: true })
    .click();
  await expect(page.locator(".garden-stage")).toHaveAttribute(
    "data-scene-state",
    "ready",
    { timeout: 15000 },
  );
  await expect(page.locator(".garden-canvas canvas")).toHaveCount(1);
  await expect
    .poll(() => page.locator(".garden-canvas").getAttribute("data-frames"))
    .not.toBeNull();
  const frames = await page
    .locator(".garden-canvas")
    .getAttribute("data-frames");
  await page.waitForTimeout(350);
  expect(await page.locator(".garden-canvas").getAttribute("data-frames")).toBe(
    frames,
  );
  await page
    .getByRole("group", { name: "Terrasses du jardin" })
    .getByRole("button", { name: /Assistants/ })
    .click();
  await expect(
    page.getByRole("region", { name: "Votre prochaine action" }),
  ).toContainText("Préparer une mission");
  await expect
    .poll(async () =>
      Number(await page.locator(".garden-canvas").getAttribute("data-frames")),
    )
    .toBeGreaterThan(Number(frames));
  expect(
    Number(
      await page.locator(".garden-canvas").getAttribute("data-draw-calls"),
    ),
  ).toBeLessThan(50);
  const pixelBudget = await page
    .locator(".garden-canvas canvas")
    .evaluate((canvas: HTMLCanvasElement) => ({
      pixels: canvas.width,
      logical: canvas.getBoundingClientRect().width,
    }));
  expect(pixelBudget.pixels).toBeLessThanOrEqual(pixelBudget.logical * 1.5 + 1);
  await page
    .getByRole("button", {
      name: "Suivre les préférences d’animation de l’appareil",
    })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await expect(async () => {
    const before = await page
      .locator(".garden-canvas")
      .getAttribute("data-frames");
    await page.waitForTimeout(400);
    expect(
      await page.locator(".garden-canvas").getAttribute("data-frames"),
    ).toBe(before);
  }).toPass({ timeout: 12000 });
  if (test.info().project.name === "desktop") {
    const before = Number(
      await page.locator(".garden-canvas").getAttribute("data-frames"),
    );
    const bounds = (await page.locator(".garden-canvas canvas").boundingBox())!;
    await page.mouse.move(
      bounds.x + bounds.width * 0.85,
      bounds.y + bounds.height * 0.4,
    );
    await expect
      .poll(async () =>
        Number(
          await page.locator(".garden-canvas").getAttribute("data-frames"),
        ),
      )
      .toBeGreaterThan(before);
    await expect(async () => {
      const current = await page
        .locator(".garden-canvas")
        .getAttribute("data-frames");
      await page.waitForTimeout(400);
      expect(
        await page.locator(".garden-canvas").getAttribute("data-frames"),
      ).toBe(current);
    }).toPass({ timeout: 10000 });
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("lifeos-relief");
        return (await cache.keys()).some((request) =>
          request.url.includes("gardenScene-"),
        );
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Explorer en 3D", exact: true })
    .click();
  await expect(page.locator(".garden-stage")).toHaveAttribute(
    "data-scene-state",
    "ready",
    { timeout: 15000 },
  );
  await nav(page).getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".garden-canvas canvas")).toHaveCount(0);
});
test("sans WebGL, le visuel et les commandes restent utilisables", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    `const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){if(args[0]==='webgl2')return null;return getContext.apply(this,args);};`,
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await home(page);
  await page
    .getByRole("button", { name: "Explorer en 3D", exact: true })
    .click();
  await expect(page.locator(".garden-stage")).toHaveAttribute(
    "data-scene-state",
    "fallback",
  );
  await expect(
    page.getByText("Le jardin reste accessible en image."),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Terrasses du jardin" })
    .getByRole("button", { name: /Projets/ })
    .click();
  await page
    .getByRole("button", { name: "Créer un projet", exact: true })
    .click();
  await page.getByLabel("Nom du projet").fill("Projet sans relief");
  await page.getByRole("button", { name: "Enregistrer le projet" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Projet sans relief", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
