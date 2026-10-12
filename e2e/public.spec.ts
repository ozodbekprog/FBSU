import { expect, test } from "@playwright/test";

test("landing sarlavhasi va login havolasi ko'rinadi", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /yagona platformada/ })).toBeVisible();

  const loginLink = page.getByRole("link", { name: "Kirish" }).first();
  await expect(loginLink).toBeVisible();
  await loginLink.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Tizimga kirish" })).toBeVisible();
});

test("landingda mobil ilova bo'limi ko'rinadi", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#ilova");
  await section.scrollIntoViewIfNeeded();
  await expect(
    section.getByRole("heading", { name: /Android va iOS uchun/ }),
  ).toBeVisible();
  await expect(section.getByText("Tez orada: Google Play va App Store")).toBeVisible();
});

test("mobil ilova sahifasi sessiyasiz ham ochiladi", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app/);
  await expect(
    page.getByRole("heading", { name: /Android va iOS uchun/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("Google Play versiyasi tez orada chiqadi.")).toBeVisible();
  await expect(page.getByText("App Store versiyasi tez orada chiqadi.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Telefonda ochib o'rnating" })).toBeVisible();
});
