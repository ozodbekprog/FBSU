import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "http://localhost:3000";
const OUT_DIR = join(ROOT, "test-results", "edupage");

async function login(page, email) {
  await page.goto(`${BASE_URL}/login`);
  if (!/\/dashboard/.test(page.url())) {
    await page.getByPlaceholder("email@ttpu.uz").fill(email);
    await page.getByPlaceholder("••••••••").fill("ttpu1234");
    await page.getByRole("button", { name: "Kirish" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
  }
}

async function shot(page, email, name) {
  await login(page, email);
  await page.goto(`${BASE_URL}/schedule/edupage`);
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT_DIR, name), fullPage: false });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const admin = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
    await shot(await admin.newPage(), "admin@ttpu.uz", "edupage-admin.png");

    const student = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
    await shot(await student.newPage(), "ozodbek@ttpu.uz", "edupage-student-mobile.png");
    console.log("saved to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
