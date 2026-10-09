import { chromium, request } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const FULL_PAGES = [
  "/dashboard", "/courses", "/courses/fizika", "/courses/fizika/assignments", "/courses/fizika/materials",
  "/courses/fizika/attendance", "/courses/fizika/forum", "/courses/fizika/announcements",
  "/schedule", "/calendar", "/academic-calendar", "/exams", "/grades", "/gpa", "/transcript",
  "/attendance", "/journal", "/journals", "/question-bank", "/reports", "/workload", "/staff",
  "/tasks", "/my-qr", "/access", "/access/logs", "/messages", "/notifications", "/orders",
  "/bookings", "/rooms", "/labs", "/certificates", "/finance", "/parent", "/help", "/settings",
  "/profile", "/search", "/monitoring", "/approvals", "/curator", "/documents", "/diplomas",
  "/admissions", "/admin", "/admin/users", "/admin/groups", "/admin/courses", "/admin/dictionaries",
  "/admin/generator", "/admin/structure", "/admin/departments", "/admin/import", "/admin/hemis",
  "/admin/audit", "/admin/settings", "/admin/bugs", "/admin/bounty", "/admin/updates", "/admin/orders",
  "/users/cmuv7m6bt00008o4xb2ru5k7p", "/verify/59cef4dc476b", "/apply",
];
const SHORT_PAGES = ["/dashboard", "/courses", "/schedule", "/grades", "/attendance", "/exams", "/messages", "/help", "/settings", "/profile", "/monitoring", "/staff", "/tasks", "/documents", "/finance", "/diplomas", "/admissions", "/parent", "/parent"];

const ROLES = [
  { name: "STUDENT", email: "ai1s01@ttpu.uz", pages: FULL_PAGES },
  { name: "TEACHER", email: "fizika@ttpu.uz", pages: FULL_PAGES },
  { name: "ADMIN", email: "admin@ttpu.uz", pages: FULL_PAGES },
  { name: "REGISTRAR", email: "registrator@ttpu.uz", pages: FULL_PAGES },
  { name: "REKTOR", email: "rektor@ttpu.uz", pages: SHORT_PAGES },
  { name: "PRO_RECTOR", email: "prorektor-oquv@ttpu.uz", pages: SHORT_PAGES },
  { name: "DEKAN", email: "dekan-ki@ttpu.uz", pages: SHORT_PAGES },
  { name: "KAFEDRA", email: "kafedra-di@ttpu.uz", pages: SHORT_PAGES },
  { name: "TYUTOR", email: "tyutor-1@ttpu.uz", pages: SHORT_PAGES },
  { name: "XODIM", email: "buxgalter@ttpu.uz", pages: SHORT_PAGES },
  { name: "OTA_ONA", email: "ota-ona@ttpu.uz", pages: SHORT_PAGES },
];

const report = { pages: [], consoleErrors: [], failedRequests: [] };
const browser = await chromium.launch({ channel: "chrome" });

async function loginState(email) {
  const api = await request.newContext({ baseURL: BASE });
  const csrf = await (await api.get("/api/csrf")).json();
  const res = await api.post("/api/auth/login", { headers: { "x-csrf-token": csrf.token }, data: { email, password: "ttpu1234" } });
  if (!res.ok()) { await api.dispose(); return null; }
  const state = await api.storageState();
  await api.dispose();
  return state;
}

for (const role of ROLES) {
  try {
    const state = await loginState(role.email);
    if (!state) { console.log(`LOGIN-FAIL: ${role.name}`); continue; }
    const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    let current = "";
    page.on("pageerror", (err) => report.consoleErrors.push({ role: role.name, page: current, type: "pageerror", message: String(err).slice(0, 180) }));
    page.on("console", (msg) => { if (msg.type() === "error") report.consoleErrors.push({ role: role.name, page: current, type: "console", message: msg.text().slice(0, 180) }); });
    page.on("response", (res) => { if (res.status() >= 400 && res.url().includes("/api/")) report.failedRequests.push({ role: role.name, page: current, status: res.status(), url: res.url().replace(BASE, "") }); });
    for (const p of role.pages) {
      current = p;
      try {
        const res = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(500);
        const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 4000)).catch(() => "");
        const status = res ? res.status() : 0;
        const hasError = /Nimadir xato ketdi|Sahifa topilmadi|Application error/i.test(bodyText);
        if (status >= 400 || hasError) report.pages.push({ role: role.name, page: p, status, error: hasError ? "error-boundary" : `http-${status}` });
      } catch (err) {
        report.pages.push({ role: role.name, page: p, status: -1, error: String(err).split("\n")[0].slice(0, 140) });
      }
    }
    await ctx.close();
    console.log(`ROLE TUGADI: ${role.name} (${role.pages.length} sahifa)`);
  } catch (err) {
    console.log(`ROLE XATO: ${role.name}: ${String(err).split("\n")[0].slice(0, 120)}`);
  }
}
await browser.close();
writeFileSync("/tmp/qa-pages-report.json", JSON.stringify(report, null, 1));
console.log(`SAHIFA CRAWL TUGADI: xato-sahifalar=${report.pages.length}, console=${report.consoleErrors.length}, api-xato=${report.failedRequests.length}`);
