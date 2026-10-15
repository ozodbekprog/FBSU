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

async function shot(page, email, name, path = "/schedule/edupage") {
  await login(page, email);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT_DIR, name), fullPage: false });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const admin = await browser.newContext({ viewport: { width: 1600, height: 1150 }, deviceScaleFactor: 2 });
    await shot(await admin.newPage(), "admin@ttpu.uz", "admin-import-edupage.png", "/admin/import");
    await shot(await admin.newPage(), "admin@ttpu.uz", "admin-schedule.png", "/schedule");

    const studentSchedule = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await shot(await studentSchedule.newPage(), "ozodbek@ttpu.uz", "fbsu-schedule-student.png", "/schedule");

    const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
    await shot(await staff.newPage(), "admin@ttpu.uz", "fbsu-admin-users.png", "/admin/users");

    const teacher = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await shot(await teacher.newPage(), "n.mahamatov@ttpu.uz", "teacher-schedule.png", "/schedule");
    console.log("saved to", OUT_DIR);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
