import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("OpenBoard", () => {
  test("eslatma yaratish, kod va formula bloklari, lab shabloni, saqlash", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    page.on("dialog", (dialog) => dialog.accept());
    await login(page, "ozodbek@ttpu.uz");

    await page.goto("/board");
    await expect(
      page.getByRole("button", { name: "Yangi eslatma", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Yangi eslatma", exact: true }).click();
    await page.getByRole("button", { name: "Bo'sh eslatma" }).click();
    await expect(page.getByText("Yangi eslatma").first()).toBeVisible();

    const noteTitle = `E2E doska testi ${Date.now()}`;
    await page.getByPlaceholder("Sarlavha").fill(noteTitle);

    await page
      .getByRole("button", { name: "Kod", exact: true })
      .last()
      .click();
    await page.getByPlaceholder("Kod yozing...").fill("console.log(6*7)");
    await page.getByRole("button", { name: "Ishga tushirish" }).click();
    await expect(page.getByText("42", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Formula", exact: true }).click();
    await page
      .getByPlaceholder("LaTeX kiriting, masalan \\frac{a}{b}")
      .fill("\\frac{a}{b}");
    await expect(page.locator(".katex")).toBeVisible();

    await page.getByRole("button", { name: "Laboratoriya shabloni" }).click();
    await expect(page.getByText("Maqsad", { exact: true })).toBeVisible();

    await expect(page.getByText("Saqlandi")).toBeVisible();
    await page.reload();
    await expect(page.getByPlaceholder("Sarlavha")).toHaveValue(noteTitle);
    await page.getByRole("button", { name: "O'chirish", exact: true }).click();
    await expect(page.getByText(noteTitle)).toHaveCount(0);
    await expect(page.getByText("Saqlandi")).toBeVisible({ timeout: 15_000 });
  });
});
