import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData } from "../src/domain/model";
import { addGithubLink } from "../src/domain/github";
import type { Mission } from "../src/domain/assistants";

const date = "2026-10-19T22:00:00Z";
const mission: Mission = {
  id: "https-mission",
  title: "Mission HTTPS fictive",
  assistant: "chatgpt",
  projectId: "",
  objective: "Préparer une proposition",
  criteria: "Vérifier les faits",
  files: "FILE-NEVER-AUTO-SENT",
  due: "",
  status: "review",
  reports: [],
  createdAt: date,
  updatedAt: date,
  validatedAt: null,
};
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
async function close(page: Page) {
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("HTTPS réel : appairage partagé GitHub/IA, consentement, révocation, export sans secret et hors ligne", async ({
  page,
  context,
}, testInfo) => {
  const origin = `https://127.0.0.1:${testInfo.project.name === "desktop" ? 4180 : 4181}`;
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/connector/"))
      calls.push(new URL(request.url()).pathname);
    expect(request.url()).not.toMatch(/api\.(openai|anthropic|github)\.com/);
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  const data = addGithubLink(
    { ...emptyData(), missions: [mission] },
    mission.id,
    "https://github.com/example/private/pull/42",
  );
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "https-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ application: "LifeOS", exportedAt: date, data }),
    ),
  });
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await center(page);
  await page
    .getByRole("button", {
      name: "GitHub pour Mission HTTPS fictive",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Privé, par mon serveur", exact: true })
    .click();
  expect(calls).toHaveLength(0);
  await expect(
    page.getByRole("region", { name: "Accès GitHub", exact: true }),
  ).toContainText(origin);
  await page
    .getByRole("button", { name: "Vérifier ce serveur HTTPS", exact: true })
    .click();
  await page
    .getByLabel("Code d’appairage du terminal")
    .fill("https-browser-fixture-code");
  await page
    .getByRole("button", {
      name: "Appairer ce navigateur au serveur",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Session appairée jusqu/)).toBeVisible();
  const cookie = (await context.cookies(origin + "/api/connector/status")).find(
    (item) => item.name === "__Secure-lifeos_connector",
  )!;
  expect(cookie).toMatchObject({
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
    path: "/api/connector",
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "lifeos_connector",
  );
  expect(calls.filter((path) => path.endsWith("/github/read"))).toHaveLength(0);
  const viewport = page.viewportSize()!;
  for (const width of [viewport.width, 320]) {
    await page.setViewportSize({ width, height: viewport.height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`https-paired-${width}.png`),
    });
  }
  await page.setViewportSize(viewport);

  await page
    .getByRole("button", { name: /Vérifier et garder un relevé/ })
    .click();
  await expect(page.locator(".github-link")).toContainText(
    "Référence privée HTTPS fictive",
  );
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fusionnée",
  );
  await close(page);
  await page
    .getByRole("button", {
      name: "API OpenAI pour Mission HTTPS fictive",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Texte à transmettre")).not.toContainText(
    "FILE-NEVER-AUTO-SENT",
  );
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Accès IA", exact: true })
      .getByRole("status"),
  ).toContainText("0 / 2 essais");
  expect(calls.filter((path) => path.endsWith("/pair"))).toHaveLength(1);
  await page
    .getByLabel("Texte à transmettre")
    .fill("Analyser uniquement ce texte HTTPS explicite.");
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à OpenAI",
      exact: true,
    })
    .click();
  const send = page.getByRole("button", {
    name: "Autoriser et envoyer à OpenAI",
    exact: true,
  });
  await expect(send).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("https-consent.png") });

  expect(calls.filter((path) => path.endsWith("/execute"))).toHaveLength(0);
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await send.click();
  await expect(page.locator(".ai-draft pre")).toContainText(
    "Proposition HTTPS fictive",
  );
  expect(calls.filter((path) => path.endsWith("/execute"))).toHaveLength(1);
  await page
    .getByRole("button", {
      name: "Conserver comme compte-rendu non vérifié",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("Brouillon conservé");
  await page
    .getByRole("button", { name: "Déconnecter le serveur", exact: true })
    .click();
  await expect(page.getByLabel("Code d’appairage du terminal")).toBeVisible();
  expect(
    (await context.cookies()).some((item) => item.name === cookie.name),
  ).toBe(false);
  const denied = await page.evaluate(async () => {
    const response = await fetch("/api/connector/github/read", {
      method: "POST",
      headers: { "X-LifeOS-Request": "1", "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: "example",
        repo: "private",
        kind: "pull",
        number: 42,
      }),
    });
    return response.status;
  });
  expect(denied).toBe(401);
  await close(page);
  await expect(page.locator(".mission-status")).toHaveText("À vérifier");
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = await readFile((await (await downloaded).path())!, "utf8");
  expect(raw).not.toMatch(
    /https-browser-fixture-(code|github-token|openai-key)|lifeos_connector|BEGIN PRIVATE KEY/,
  );
  const exported = JSON.parse(raw).data;
  expect(exported.version).toBe(6);
  expect(exported.missions[0].status).toBe("review");
  expect(exported.missions[0].reports[0].body).toContain(
    "BROUILLON IA — NON VÉRIFIÉ",
  );
  expect(raw).toContain("Référence privée HTTPS fictive");
  await close(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await center(page);
  await page
    .getByRole("button", {
      name: "GitHub pour Mission HTTPS fictive",
      exact: true,
    })
    .click();
  await expect(page.locator(".github-link")).toContainText(
    "Référence privée HTTPS fictive",
  );
  await expect(page.locator(".github-link")).toContainText(
    "Pull request fusionnée",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
