import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyData } from "../src/domain/model";
import { aiPayload } from "../src/domain/ai";
const date = "2026-10-19T12:00:00Z";
const mission = {
  id: "m",
  title: "Demande IA fictive",
  assistant: "chatgpt",
  projectId: "",
  objective: "Définir des étapes réalistes",
  criteria: "Séparer faits et hypothèses",
  files: "FILE-NEVER-AUTO-SENT",
  due: "",
  status: "review",
  reports: [],
  createdAt: date,
  updatedAt: date,
  validatedAt: null,
};
async function setup(page: Page, origin = "/", assistant = "chatgpt") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin);
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await page.getByLabel("Restaurer une sauvegarde JSON").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        application: "LifeOS",
        exportedAt: date,
        data: { ...emptyData(), missions: [{ ...mission, assistant }] },
      }),
    ),
  });
  await page
    .getByRole("button", { name: "Confirmer le remplacement", exact: true })
    .click();
  await open(page, assistant);
}
async function open(page: Page, assistant = "chatgpt") {
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
      name: `API ${assistant === "chatgpt" ? "OpenAI" : "Anthropic"} pour Demande IA fictive`,
      exact: true,
    })
    .click();
}
test("consentement, vrai serveur avec fournisseur fictif, brouillon incomplet adopté et sauvegardé hors ligne", async ({
  page,
  context,
}, testInfo) => {
  const requests: { path: string; body: string | null }[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/connector/"))
      requests.push({
        path: new URL(request.url()).pathname,
        body: request.postData(),
      });
    expect(request.url()).not.toContain("api.openai.com");
  });
  const origin = `http://127.0.0.1:${testInfo.project.name === "desktop" ? 4176 : 4177}`;
  await setup(page, origin);
  expect(requests).toHaveLength(0);
  await expect(page.getByLabel("Texte à transmettre")).not.toContainText(
    "FILE-NEVER-AUTO-SENT",
  );
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Code d’appairage du terminal")
    .fill("fixture-ai-browser-code");
  await page
    .getByRole("button", { name: "Appairer l’accès IA", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Accès IA", exact: true })
      .getByRole("status"),
  ).toContainText("0 / 4 essais");
  await page
    .getByLabel("Texte à transmettre")
    .fill("Analyser uniquement ce texte explicite.");
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à OpenAI",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Autorisation de l’envoi IA",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    requests.filter((item) => item.path.endsWith("/execute")),
  ).toHaveLength(0);
  await expect(
    page.getByRole("button", {
      name: "Autoriser et envoyer à OpenAI",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByText("Requête exacte préparée pour OpenAI", { exact: true })
    .click();
  await expect(page.locator(".ai-approval pre").first()).toContainText(
    '"store": false',
  );
  await expect(page.locator(".ai-approval pre").first()).toContainText(
    "Analyser uniquement ce texte explicite.",
  );
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.locator(".unsaved-prompt")).toContainText("facturation");
  await page
    .getByRole("button", { name: "Continuer la modification", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await page
    .getByRole("button", { name: "Autoriser et envoyer à OpenAI", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Brouillon reçu", exact: true }),
  ).toContainText("Réponse incomplète");
  await expect(page.locator(".ai-draft pre")).toContainText(
    "Proposition fictive <img",
  );
  await expect(page.locator(".ai-draft img")).toHaveCount(0);
  expect(
    requests.filter((item) => item.path.endsWith("/execute")),
  ).toHaveLength(1);
  const body = JSON.parse(
    requests.find((item) => item.path.endsWith("/prepare"))!.body!,
  );
  expect(body).toEqual({
    text: "Analyser uniquement ce texte explicite.",
    maxOutputTokens: 512,
    model: "gpt-5.6-terra",
  });
  await page
    .getByRole("button", { name: "Déconnecter le serveur", exact: true })
    .click();
  await expect(page.getByLabel("Code d’appairage du terminal")).toBeVisible();
  await expect(page.locator(".ai-draft")).toContainText("Proposition fictive");
  await expect(
    page.getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à OpenAI",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Conserver comme compte-rendu non vérifié",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("Brouillon conservé");

  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = await readFile((await (await downloaded).path())!, "utf8");
  expect(raw).not.toMatch(
    /fixture-only-openai-key|fixture-ai-browser-code|lifeos_connector/,
  );
  const result = JSON.parse(raw).data;
  expect(result.version).toBe(7);
  expect(result.missions[0].status).toBe("review");
  expect(result.missions[0].reports[0].body).toContain(
    "BROUILLON IA — NON VÉRIFIÉ",
  );
  expect(result.missions[0].reports[0].body).toContain("RÉPONSE INCOMPLÈTE");
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
    .getByRole("button", { name: /Modifier la mission Demande/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "BROUILLON IA — NON VÉRIFIÉ",
  );
});
test("serveur absent, refus après autorisation et aucun réessai implicite", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("absent");
  const budget = {
    day: "2026-10-19",
    attempts: 0,
    reservedNanoUsd: 0,
    dailyNanoUsd: 100000000,
    dailyCalls: 1,
  };
  await page.route("**/api/connector/ai/status", (route) =>
    route.fulfill({
      json: {
        configured: true,
        paired: true,
        expiresAt: date,
        budget,
        catalogFresh: true,
        providers: { OpenAI: true, Anthropic: false },
      },
    }),
  );
  await page.route("**/api/connector/ai/prepare", (route) =>
    route.fulfill({
      json: {
        id: "a".repeat(32),
        expiresAt: date,
        payload: aiPayload(JSON.parse(route.request().postData()!)),
        budget,
      },
    }),
  );
  let sends = 0;
  await page.route("**/api/connector/ai/execute", (route) => {
    sends++;
    return route.fulfill({
      status: 409,
      json: {
        error:
          "Enveloppe conservée. Réponse perdue, aucun réessai automatique.",
      },
    });
  });
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à OpenAI",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await page
    .getByRole("button", { name: "Autoriser et envoyer à OpenAI", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Réponse perdue");
  await expect(
    page.getByRole("button", {
      name: "Autoriser et envoyer à OpenAI",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(sends).toBe(1);
});

test("Claude : choix sans réseau, consentement renouvelé, deux modèles et comptes-rendus sourcés", async ({
  page,
}, testInfo) => {
  const requests: { path: string; body: string | null }[] = [];
  page.on("request", (request) => {
    expect(request.url()).not.toMatch(/api\.(anthropic|openai)\.com/);
    if (request.url().includes("/api/connector/"))
      requests.push({
        path: new URL(request.url()).pathname,
        body: request.postData(),
      });
  });
  const origin = `http://127.0.0.1:${testInfo.project.name === "desktop" ? 4178 : 4179}`;
  await setup(page, origin, "claude");
  const select = page.getByLabel("Modèle pour cette demande");
  await expect(select).toHaveValue("claude-sonnet-5-5");
  await select.selectOption("claude-haiku-5-5");
  expect(requests).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Code d’appairage du terminal")
    .fill("fixture-ai-browser-code");
  await page
    .getByRole("button", { name: "Appairer l’accès IA", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Accès IA", exact: true }),
  ).toContainText("0 / 4 essais");
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à Anthropic",
      exact: true,
    })
    .click();
  await expect(select).toBeDisabled();
  await page
    .getByText("Requête exacte préparée pour Anthropic", { exact: true })
    .click();
  await expect(page.locator(".ai-approval pre").first()).toContainText(
    '"model": "claude-haiku-5-5"',
  );
  await expect(page.locator(".ai-approval pre").first()).toContainText(
    '"type": "disabled"',
  );
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await page
    .getByRole("button", {
      name: "Revenir au texte, sans réessai",
      exact: true,
    })
    .click();
  await select.selectOption("claude-sonnet-5-5");
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à Anthropic",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /J’autorise la transmission/ }),
  ).not.toBeChecked();
  expect(requests.filter((item) => item.path.endsWith("execute"))).toHaveLength(
    0,
  );
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await page
    .getByRole("button", {
      name: "Autoriser et envoyer à Anthropic",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("claude-sonnet-5-5");
  await expect(page.locator(".ai-draft img")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Conserver comme compte-rendu non vérifié",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("Brouillon conservé");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "API Anthropic pour Demande IA fictive",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Modèle pour cette demande")
    .selectOption("claude-haiku-5-5");
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Accès IA", exact: true }),
  ).toContainText("1 / 4 essais");
  await page
    .getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à Anthropic",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", { name: /J’autorise la transmission/ })
    .check();
  await page
    .getByRole("button", {
      name: "Autoriser et envoyer à Anthropic",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("claude-haiku-5-5");
  await page
    .getByRole("button", {
      name: "Conserver comme compte-rendu non vérifié",
      exact: true,
    })
    .click();
  await expect(page.locator(".ai-draft")).toContainText("Brouillon conservé");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  const raw = await readFile((await (await download).path())!, "utf8");
  expect(raw).not.toMatch(
    /fixture-only-|fixture-ai-browser-code|lifeos_connector/,
  );
  const data = JSON.parse(raw).data;
  expect(data.version).toBe(7);
  expect(data.missions[0].status).toBe("review");
  expect(data.missions[0].reports).toHaveLength(2);
  expect(data.missions[0].reports[0].evidence).toContain("sonnet-5-5/overview");
  expect(data.missions[0].reports[1].evidence).toContain("haiku-5-5/overview");
  expect(requests.filter((item) => item.path.endsWith("execute"))).toHaveLength(
    2,
  );
});

test("Claude non configuré : modèle choisi conservé et aucun repli OpenAI", async ({
  page,
}) => {
  await setup(page, "/", "claude");
  let prepare = 0;
  await page.route("**/api/connector/ai/prepare", (route) => {
    prepare++;
    return route.abort();
  });
  await page.route("**/api/connector/ai/status", (route) =>
    route.fulfill({
      json: {
        configured: true,
        paired: true,
        expiresAt: date,
        budget: null,
        catalogFresh: true,
        providers: { OpenAI: true, Anthropic: false },
      },
    }),
  );
  await page
    .getByRole("button", {
      name: "Vérifier l’accès IA du serveur",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Accès IA", exact: true }),
  ).toContainText("Accès Anthropic désactivé");
  await page
    .getByLabel("Modèle pour cette demande")
    .selectOption("claude-haiku-5-5");
  await expect(
    page.getByRole("button", {
      name: "Préparer l’aperçu sans envoyer à Anthropic",
      exact: true,
    }),
  ).toBeDisabled();
  expect(prepare).toBe(0);
});
