import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData } from "../src/domain/model";
const date = "2026-10-19T12:00:00Z";
const data = () => ({
  ...emptyData(),
  missions: [
    {
      id: "private-mission",
      title: "Révision privée fictive",
      assistant: "chatgpt",
      projectId: "",
      objective: "NEVER-SENT-MISSION-TEXT",
      criteria: "Relire les preuves",
      files: "",
      due: "",
      status: "review",
      reports: [],
      createdAt: date,
      updatedAt: date,
      validatedAt: null,
    },
  ],
  githubLinks: [
    {
      id: "private-link",
      missionId: "private-mission",
      target: { owner: "example", repo: "private", kind: "pull", number: 42 },
      createdAt: date,
      checks: [],
    },
  ],
});
async function restore(page: Page) {
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        application: "LifeOS",
        exportedAt: date,
        data: data(),
      }),
    ),
  });
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function open(page: Page) {
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
  await page
    .getByRole("button", {
      name: "GitHub pour Révision privée fictive",
      exact: true,
    })
    .click();
}
const privateMode = (page: Page) =>
  page
    .getByRole("button", { name: "Privé, par mon serveur", exact: true })
    .click();
const verify = (page: Page) =>
  page
    .getByRole("button", { name: "Vérifier le serveur local", exact: true })
    .click();

test("serveur réel local, appairage sans lecture, relevé privé fictif, export sans clés et consultation hors ligne", async ({
  page,
  context,
}, testInfo) => {
  const origin = `http://127.0.0.1:${testInfo.project.name === "desktop" ? 4174 : 4175}`;
  const requests: { path: string; method: string; body: string | null }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/connector/"))
      requests.push({
        path: new URL(request.url()).pathname,
        method: request.method(),
        body: request.postData(),
      });
    expect(request.url()).not.toContain("api.github.com");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  await restore(page);
  await open(page);
  expect(requests).toEqual([]);
  await privateMode(page);
  await expect(
    page.getByRole("button", { name: /Vérifier et garder un relevé/ }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
  await verify(page);
  await expect(page.getByLabel("Code d’appairage du terminal")).toBeVisible();
  expect(requests.map((item) => item.path)).toEqual(["/api/connector/status"]);
  await page
    .getByLabel("Code d’appairage du terminal")
    .fill("fixture-browser-code");
  await page
    .getByRole("button", {
      name: "Appairer ce navigateur au serveur",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Accès GitHub", exact: true })
      .getByRole("status"),
  ).toContainText("Session appairée");
  expect(
    requests.filter((item) => item.path.endsWith("/github/read")),
  ).toHaveLength(0);
  const cookies = await context.cookies(`${origin}/api/connector/status`);
  expect(
    cookies.find((cookie) => cookie.name === "lifeos_connector"),
  ).toMatchObject({
    httpOnly: true,
    sameSite: "Strict",
    path: "/api/connector",
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "lifeos_connector",
  );
  await page
    .getByRole("button", { name: /Vérifier et garder un relevé/ })
    .click();
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fusionnée",
  );
  await expect(page.locator(".github-link")).toContainText(
    "Réponse privée fictive <img",
  );
  await expect(page.locator(".github-link img")).toHaveCount(0);
  const reads = requests.filter((item) => item.path.endsWith("/github/read"));
  expect(reads).toEqual([
    {
      path: "/api/connector/github/read",
      method: "POST",
      body: JSON.stringify(data().githubLinks[0].target),
    },
  ]);
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible(); // No stale dirty-form warning after pairing.
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = await readFile((await (await downloaded).path())!, "utf8");
  expect(raw).not.toMatch(
    /fixture-provider|fixture-browser-code|lifeos_connector|EXCLUDED-BROWSER-BODY/,
  );
  const backup = JSON.parse(raw);
  expect(backup.data.version).toBe(6);
  expect(backup.data.githubLinks[0].checks).toHaveLength(1);
  expect(backup.data.missions[0].status).toBe("review");
  expect(backup.data).not.toHaveProperty("personal");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  const beforeReopen = requests.length;
  await open(page);
  await privateMode(page);
  expect(requests).toHaveLength(beforeReopen);
  await verify(page);
  await expect(
    page
      .getByRole("region", { name: "Accès GitHub", exact: true })
      .getByRole("status"),
  ).toContainText("Session appairée");
  await page
    .getByRole("button", { name: "Déconnecter le serveur", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Vérifier et garder un relevé/ }),
  ).toBeDisabled();
  expect(
    (await context.cookies(`${origin}/api/connector/status`)).find(
      (cookie) => cookie.name === "lifeos_connector",
    ),
  ).toBeUndefined();
  await verify(page);
  await expect(page.getByLabel("Code d’appairage du terminal")).toBeVisible();
  await expect(page.getByLabel("Code d’appairage du terminal")).toHaveValue("");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await expect(page.locator(".github-link")).toContainText(
    "Réponse privée fictive",
  );
  const beforeOffline = requests.length;
  await privateMode(page);
  expect(requests).toHaveLength(beforeOffline);
  await verify(page);
  await expect(page.getByRole("alert")).toContainText("hors ligne");
  await expect(page.locator(".github-link summary")).toHaveText(
    "Historique des relevés · 1",
  );
  expect(errors).toEqual([]);
});
test("serveur absent et incompatible expliqués, aucun basculement public implicite", async ({
  page,
}) => {
  await page.goto("/");
  await restore(page);
  await open(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/api/") ||
      request.url().includes("api.github.com")
    )
      requests.push(request.url());
  });
  await privateMode(page);
  expect(requests).toEqual([]);
  await verify(page);
  await expect(page.getByRole("alert")).toContainText("absent");
  await expect(
    page.getByRole("button", { name: /Vérifier et garder un relevé/ }),
  ).toBeDisabled();
  await page.route("**/api/connector/status", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Configuration serveur à vérifier." },
    }),
  );
  await verify(page);
  await expect(page.getByRole("alert")).toContainText("Configuration serveur");
  expect(requests).toHaveLength(2);
  expect(requests.every((url) => url.includes("/api/connector/status"))).toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Public, sans compte", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Vérifier et garder un relevé",
      exact: true,
    }),
  ).toBeEnabled();
  expect(requests).toHaveLength(2);
});
