import { expect, test } from "@playwright/test";
test("sauvegardes et disponibilité Android sans permission navigateur", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir les sauvegardes" }).click();
  await expect(
    page.getByRole("heading", { name: "Votre rendez-vous quotidien" }),
  ).toBeVisible();
  await expect(
    page.getByText("Aucun rappel navigateur n’est activé.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Activer le rappel", exact: true }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter mes données", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/^lifeos-.*\.json$/);
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
});
