import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData } from "../src/domain/model";
import type { Mission } from "../src/domain/assistants";
const date = "2026-10-19T12:00:00.000Z";
const sha = "a".repeat(40);
const mission: Mission = {
  id: "m1",
  title: "Livraison à vérifier",
  assistant: "chatgpt",
  projectId: "",
  objective: "Contrôler les critères",
  criteria: "Les données restent conservées",
  files: "",
  due: "",
  status: "review",
  reports: [],
  createdAt: date,
  updatedAt: date,
  validatedAt: null,
};
const fixture = () => ({ ...emptyData(), missions: [mission] });
const pullUrl = "https://github.com/a/b/pull/1";
const pull = (patch = {}) => ({
  html_url: pullUrl,
  number: 1,
  title: "Un changement public",
  state: "closed",
  merged: false,
  draft: false,
  head: { sha },
  updated_at: date,
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
async function center(page: Page) {
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
  await page.getByRole("button", { name: /^Missions IA/ }).click();
}
const open = (page: Page) =>
  page
    .getByRole("button", {
      name: "GitHub pour Livraison à vérifier",
      exact: true,
    })
    .click();
async function close(page: Page) {
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function add(page: Page, url = pullUrl) {
  await page
    .getByRole("button", { name: "Relier un lien GitHub", exact: true })
    .click();
  await page.getByLabel("Lien GitHub").fill(url);
  await page
    .getByRole("button", { name: "Relier ce lien", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "GitHub, les faits conservés",
      exact: true,
    }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 9, 19, 14));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Faites de la place à l’essentiel." }),
  ).toBeVisible();
  // Install the API fixture after the worker has claimed this document, so
  // its ownership cannot change during the intercepted public request.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await restore(page, fixture());
  await center(page);
});
test("liens locaux sans réseau, lecture explicite, CI datée et validation de mission indépendante", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("https://api.github.com/**", async (route) => {
    calls.push(route.request().url());
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers()).not.toHaveProperty("authorization");
    expect(route.request().headers()).not.toHaveProperty("cookie");
    expect(route.request().postData()).toBeNull();
    await route.fulfill({
      json: route.request().url().includes("/pulls/")
        ? pull()
        : {
            html_url: "https://github.com/a/b/actions/runs/3",
            id: 3,
            name: "Tests",
            display_title: "Une livraison",
            status: "completed",
            conclusion: "success",
            head_sha: sha,
            run_attempt: 2,
            updated_at: date,
          },
    });
  });
  await open(page);
  await add(page);
  await expect(page.locator(".github-link")).toContainText(
    "Aucun relevé conservé",
  );
  expect(calls).toHaveLength(0);
  await close(page);
  await page.reload();
  await center(page);
  await open(page);
  expect(calls).toHaveLength(0);
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fermée, non fusionnée",
  );
  await add(page, "https://github.com/a/b/actions/runs/3");
  const run = page
    .locator(".github-link")
    .filter({ hasText: "Exécution GitHub" });
  await run
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(run).toContainText("Réussite");
  await expect(run).toContainText("Tentative 2");
  await expect(run).toContainText(sha);
  await expect(
    page.getByText(
      "Relevé conservé. Le statut de votre mission n’a pas changé.",
    ),
  ).toBeVisible();
  expect(calls).toEqual([
    "https://api.github.com/repos/a/b/pulls/1",
    "https://api.github.com/repos/a/b/actions/runs/3",
  ]);
  await close(page);
  await expect(page.locator(".mission-status")).toHaveText("À vérifier");
  await page
    .getByRole("button", { name: "Instructions pour Livraison à vérifier" })
    .click();
  await expect(page.getByLabel("Instructions préparées")).toContainText(
    pullUrl,
  );
  await expect(page.getByLabel("Instructions préparées")).toContainText(
    "ne constituent pas une validation",
  );
});
test("relevés conservés après erreur, export v6, migration v5 et restauration hors ligne", async ({
  page,
  context,
}) => {
  let reads = 0;
  let fail = false;
  await page.route("https://api.github.com/**", async (route) => {
    reads++;
    await route.fulfill(
      fail
        ? { status: 404, json: { message: "Pas public" } }
        : {
            json: pull({ title: "<img src=x onerror=alert(1)>", merged: true }),
          },
    );
  });
  await open(page);
  await add(page);
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fusionnée",
  );
  await expect(page.locator(".github-link img")).toHaveCount(0);
  await expect(page.locator(".github-link")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  fail = true;
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "dernier relevé reste conservé",
  );
  await expect(page.locator(".github-link summary")).toHaveText(
    "Historique des relevés · 1",
  );
  expect(reads).toBe(2);
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
  expect(raw.data.githubLinks[0].checks).toHaveLength(1);
  expect(raw.data.missions[0].status).toBe("review");
  expect(raw.data).not.toHaveProperty("personal");
  await close(page);
  const { githubLinks: _links, ...v5 } = raw.data;
  await restore(page, { ...v5, version: 5 });
  await open(page);
  await expect(page.locator(".github-link")).toHaveCount(0);
  expect(reads).toBe(2);
  await close(page);
  await restore(page, raw.data);
  expect(reads).toBe(2);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.unrouteAll();
  await context.setOffline(true);
  await page.reload();
  await center(page);
  await open(page);
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fusionnée",
  );
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("hors ligne");
  await expect(page.locator(".github-link summary")).toHaveText(
    "Historique des relevés · 1",
  );
});
test("doublons et hôtes refusés, historique effacé explicitement et mission supprimée sans lien orphelin", async ({
  page,
}) => {
  await page.route("https://api.github.com/**", async (route) =>
    route.fulfill({ json: pull() }),
  );
  await open(page);
  await add(page);
  await page
    .getByRole("button", { name: "Relier un lien GitHub", exact: true })
    .click();
  await page
    .getByLabel("Lien GitHub")
    .fill("https://github.com/a/b/pull/1?token=secret");
  await page
    .getByRole("button", { name: "Relier ce lien", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("sans paramètre");
  await page.getByLabel("Lien GitHub").fill(pullUrl);
  await page
    .getByRole("button", { name: "Relier ce lien", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("déjà relié");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", {
        name: "Vérifier et garder un relevé",
        exact: true,
      })
      .click();
    await expect(page.locator(".github-link summary")).toHaveText(
      `Historique des relevés · ${i + 1}`,
    );
  }
  await page.locator(".github-link summary").click();
  await page
    .getByRole("button", { name: "Effacer les anciens relevés", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Confirmation GitHub" })
    .getByRole("button", { name: "Garder les relevés", exact: true })
    .click();
  await expect(page.locator(".github-history")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Effacer les anciens relevés", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Confirmation GitHub" })
    .getByRole("button", {
      name: "Confirmer l’effacement GitHub local",
      exact: true,
    })
    .click();
  await expect(page.locator(".github-history")).toHaveCount(1);
  await close(page);
  await page
    .getByRole("button", { name: "Supprimer la mission Livraison à vérifier" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("liens/relevés GitHub");
  await page
    .getByRole("button", { name: "Confirmer la suppression", exact: true })
    .click();
  await expect(page.locator(".mission-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await expect(page.getByRole("dialog")).toContainText("0 liens GitHub");
});
test("quota respecté sans répétition réseau, annulation et refus d’un import incohérent", async ({
  page,
}) => {
  let reads = 0;
  await page.route("https://api.github.com/**", async (route) => {
    reads++;
    await route.fulfill({
      status: 429,
      headers: { "retry-after": "120" },
      json: {},
    });
  });
  await open(page);
  await add(page);
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Quota");
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("attendre");
  expect(reads).toBe(1);
  await close(page);
  await page.reload();
  await center(page);
  await open(page);
  await page.unrouteAll();
  await page.route("https://api.github.com/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.abort("timedout").catch(() => {});
  });
  await page
    .getByRole("button", { name: "Vérifier et garder un relevé", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Annuler la lecture", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("annulée");
  await expect(page.locator(".github-history")).toHaveCount(0);
  await close(page);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const data = {
    ...fixture(),
    githubLinks: [
      {
        id: "link",
        missionId: "absent",
        target: { owner: "a", repo: "b", kind: "pull", number: 1 },
        checks: [],
        createdAt: date,
      },
    ],
  };
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
    ),
  });
  await expect(page.getByRole("alert")).toContainText("Fichier invalide");
  await expect(
    page.getByRole("button", {
      name: "Confirmer le remplacement",
      exact: true,
    }),
  ).toHaveCount(0);
});
