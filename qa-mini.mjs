import { chromium, request } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const BASE = "http://localhost:3000";
const ROLES = [
  ["ADMIN", "admin@ttpu.uz"], ["REGISTRAR", "registrator@ttpu.uz"], ["REKTOR", "rektor@ttpu.uz"],
  ["PRO_RECTOR", "prorektor-oquv@ttpu.uz"], ["DEKAN", "dekan-ki@ttpu.uz"], ["KAFEDRA", "kafedra-di@ttpu.uz"],
  ["TYUTOR", "tyutor-1@ttpu.uz"], ["XODIM", "buxgalter@ttpu.uz"], ["OTA_ONA", "ota-ona@ttpu.uz"],
  ["STUDENT2", "ai1s02@ttpu.uz"], ["TEACHER2", "t.prog@ttpu.uz"],
];
const PAGES = [
  "/dashboard", "/courses", "/courses/fizika", "/schedule", "/exams", "/grades", "/attendance",
  "/messages", "/notifications", "/staff", "/tasks", "/my-qr", "/rooms", "/bookings",
  "/monitoring", "/reports", "/documents", "/diplomas", "/finance", "/admissions",
  "/admin", "/admin/users", "/admin/orders", "/admin/audit", "/admin/hemis",
  "/curator", "/approvals", "/parent", "/workload", "/settings", "/help", "/search",
];

const report = existsSync("/tmp/qa-mini-report.json")
  ? JSON.parse(readFileSync("/tmp/qa-mini-report.json", "utf8"))
  : { done: [], pages: [], consoleErrors: [], failedRequests: [] };

function save() { writeFileSync("/tmp/qa-mini-report.json", JSON.stringify(report, null, 1)); }

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("HARD-TIMEOUT")), ms))]);

const browser = await chromium.launch({ channel: "chrome" });

for (const [role, email] of ROLES) {
  if (report.done.includes(role)) { console.log(`SKIP ${role}`); continue; }
  try {
    const state = await withTimeout((async () => {
      const api = await request.newContext({ baseURL: BASE });
      const csrf = await (await api.get("/api/csrf", { timeout: 10000 })).json();
      const res = await api.post("/api/auth/login", { headers: { "x-csrf-token": csrf.token }, data: { email, password: "ttpu1234" }, timeout: 10000 });
      if (!res.ok()) return null;
      const s = await api.storageState();
      await api.dispose();
      return s;
    })(), 30000);
    if (!state) { console.log(`LOGIN-FAIL ${role}`); report.done.push(role); save(); continue; }
    const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    let current = "";
    page.on("pageerror", (e) => report.consoleErrors.push({ role, page: current, message: String(e).slice(0, 160) }));
    page.on("console", (m) => { if (m.type() === "error") report.consoleErrors.push({ role, page: current, message: m.text().slice(0, 160) }); });
    page.on("response", (r) => { if (r.status() >= 400 && r.url().includes("/api/")) report.failedRequests.push({ role, page: current, status: r.status(), url: r.url().replace(BASE, "") }); });
    for (const p of PAGES) {
      current = p;
      try {
        const r = await withTimeout(page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 10000 }), 15000);
        await withTimeout(page.waitForTimeout(400), 3000);
        const text = await withTimeout(page.evaluate(() => document.body.innerText.slice(0, 2500)), 5000).catch(() => "");
        const status = r ? r.status() : 0;
        if (status >= 400 || /Nimadir xato ketdi|Sahifa topilmadi|Application error/i.test(text)) {
          report.pages.push({ role, page: p, status, error: status >= 400 ? `http-${status}` : "error-boundary" });
        }
      } catch (err) {
        const msg = String(err).split("\n")[0];
        if (!/interrupted by another navigation/i.test(msg)) report.pages.push({ role, page: p, status: -1, error: msg.slice(0, 100) });
      }
    }
    await withTimeout(ctx.close(), 10000).catch(() => {});
    report.done.push(role);
    save();
    console.log(`ROLE TUGADI: ${role}`);
  } catch (err) {
    console.log(`ROLE XATO ${role}: ${String(err).split("\n")[0].slice(0, 90)}`);
    report.done.push(role); save();
  }
}
await browser.close().catch(() => {});
console.log(`MINI TUGADI. Xato-sahifa=${report.pages.length}, console=${report.consoleErrors.length}, api-xato=${report.failedRequests.length}`);
