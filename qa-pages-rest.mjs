import { chromium, request } from "playwright";
import { writeFileSync, readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const ROLES = [
  { name: "ADMIN", email: "admin@ttpu.uz" },
  { name: "REGISTRAR", email: "registrator@ttpu.uz" },
  { name: "REKTOR", email: "rektor@ttpu.uz" },
  { name: "PRO_RECTOR", email: "prorektor-oquv@ttpu.uz" },
  { name: "DEKAN", email: "dekan-ki@ttpu.uz" },
  { name: "KAFEDRA", email: "kafedra-di@ttpu.uz" },
  { name: "TYUTOR", email: "tyutor-1@ttpu.uz" },
  { name: "XODIM", email: "buxgalter@ttpu.uz" },
  { name: "OTA_ONA", email: "ota-ona@ttpu.uz" },
];
const PAGES = [
  "/dashboard", "/courses", "/courses/fizika", "/courses/fizika/assignments", "/courses/fizika/attendance", "/courses/fizika/forum",
  "/schedule", "/calendar", "/academic-calendar", "/exams", "/grades", "/gpa", "/transcript",
  "/attendance", "/journal", "/journals", "/question-bank", "/reports", "/workload", "/staff",
  "/tasks", "/my-qr", "/access", "/access/logs", "/messages", "/notifications", "/orders",
  "/bookings", "/rooms", "/labs", "/certificates", "/finance", "/parent", "/help", "/settings",
  "/profile", "/search", "/monitoring", "/approvals", "/curator", "/documents", "/diplomas",
  "/admissions", "/admin", "/admin/users", "/admin/groups", "/admin/courses", "/admin/dictionaries",
  "/admin/generator", "/admin/structure", "/admin/departments", "/admin/import", "/admin/hemis",
  "/admin/audit", "/admin/settings", "/admin/bugs", "/admin/bounty", "/admin/updates", "/admin/orders",
  "/apply",
];
const prev = JSON.parse(readFileSync("/tmp/qa-pages-report.json", "utf8"));
const report = { pages: prev.pages.filter((p) => !/ECONNREFUSED/.test(p.error ?? "") && p.role !== "STUDENT" && p.role !== "TEACHER"), consoleErrors: prev.consoleErrors.filter((c) => !/ERR_CONNECTION_REFUSED/.test(c.message)), failedRequests: prev.failedRequests };

const browser = await chromium.launch({ channel: "chrome" });
for (const role of ROLES) {
  try {
    const api = await request.newContext({ baseURL: BASE });
    const csrf = await (await api.get("/api/csrf")).json();
    const res = await api.post("/api/auth/login", { headers: { "x-csrf-token": csrf.token }, data: { email: role.email, password: "ttpu1234" } });
    if (!res.ok()) { console.log(`LOGIN-FAIL ${role.name}`); await api.dispose(); continue; }
    const state = await api.storageState();
    await api.dispose();
    const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    let current = "";
    page.on("pageerror", (err) => report.consoleErrors.push({ role: role.name, page: current, type: "pageerror", message: String(err).slice(0, 180) }));
    page.on("console", (msg) => { if (msg.type() === "error") report.consoleErrors.push({ role: role.name, page: current, type: "console", message: msg.text().slice(0, 180) }); });
    page.on("response", (r) => { if (r.status() >= 400 && r.url().includes("/api/")) report.failedRequests.push({ role: role.name, page: current, status: r.status(), url: r.url().replace(BASE, "") }); });
    for (const p of PAGES) {
      current = p;
      try {
        const r = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 12000 });
        await page.waitForTimeout(450);
        const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => "");
        const status = r ? r.status() : 0;
        if (status >= 400 || /Nimadir xato ketdi|Sahifa topilmadi|Application error/i.test(bodyText)) {
          report.pages.push({ role: role.name, page: p, status, error: status >= 400 ? `http-${status}` : "error-boundary" });
        }
      } catch (err) {
        const msg = String(err).split("\n")[0];
        if (!/interrupted by another navigation/i.test(msg)) {
          report.pages.push({ role: role.name, page: p, status: -1, error: msg.slice(0, 120) });
        }
      }
    }
    await ctx.close();
    console.log(`ROLE TUGADI: ${role.name}`);
  } catch (err) {
    console.log(`ROLE XATO ${role.name}: ${String(err).split("\n")[0].slice(0, 100)}`);
  }
}
await browser.close();
writeFileSync("/tmp/qa-pages-report2.json", JSON.stringify(report, null, 1));
console.log(`REST TUGADI: xato-sahifa=${report.pages.length}, console=${report.consoleErrors.length}, api-xato=${report.failedRequests.length}`);
