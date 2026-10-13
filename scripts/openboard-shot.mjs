import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "http://localhost:3000";
const EMAIL = "ozodbek@ttpu.uz";
const PASSWORD = "ttpu1234";
const OUT_DIR = join(ROOT, "test-results", "openboard");

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  if (!/\/dashboard/.test(page.url())) {
    await page.getByPlaceholder("email@ttpu.uz").fill(EMAIL);
    await page.getByPlaceholder("••••••••").fill(PASSWORD);
    await page.getByRole("button", { name: "Kirish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  }
}

async function openBoard(page) {
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page
    .getByPlaceholder("Qidirish")
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => {});
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 2,
    });
    const desktopPage = await desktop.newPage();
    await login(desktopPage);
    await openBoard(desktopPage);
    await desktopPage.screenshot({
      path: join(OUT_DIR, "board-desktop.png"),
      fullPage: true,
    });
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 414, height: 896 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobile.newPage();
    await login(mobilePage);
    await openBoard(mobilePage);
    await mobilePage.screenshot({
      path: join(OUT_DIR, "board-mobile.png"),
      fullPage: true,
    });
    await mobile.close();

    console.log("OpenBoard skrinshotlari saqlandi:");
    console.log("  - test-results/openboard/board-desktop.png (1920x1080, @2x)");
    console.log("  - test-results/openboard/board-mobile.png (414x896, @3x)");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`openboard-shot xato: ${error?.message ?? error}`);
  process.exit(1);
});
