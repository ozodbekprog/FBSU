import { chromium, request } from "playwright";
import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const ROLES = [
  { name: "ADMIN", email: "admin@ttpu.uz" },
  { name: "REKTOR", email: "rektor@ttpu.uz" },
  { name: "PRO_RECTOR", email: "prorektor-oquv@ttpu.uz" },
  { name: "DEKAN", email: "dekan-ki@ttpu.uz" },
  { name: "KAFEDRA", email: "kafedra-di@ttpu.uz" },
  { name: "REGISTRAR", email: "registrator@ttpu.uz" },
  { name: "TYUTOR", email: "tyutor-1@ttpu.uz" },
  { name: "TEACHER", email: "fizika@ttpu.uz" },
  { name: "STUDENT", email: "ai1s01@ttpu.uz" },
  { name: "XODIM", email: "buxgalter@ttpu.uz" },
  { name: "OTA_ONA", email: "ota-ona@ttpu.uz" },
];
const PAGES = [
  "/dashboard", "/courses", "/courses/fizika", "/courses/fizika/assignments", "/courses/fizika/materials",
  "/courses/fizika/attendance", "/courses/fizika/forum", "/courses/fizika/announcements",
  "/schedule", "/calendar", "/academic-calendar", "/exams", "/grades", "/gpa", "/transcript",
  "/attendance", "/journal", "/journals", "/question-bank", "/reports", "/workload", "/staff",
  "/tasks", "/my-qr", "/access", "/access/logs", "/messages", "/notifications", "/orders",
  "/bookings", "/rooms", "/labs", "/catalog", "/electives", "/certificates", "/finance",
  "/parent", "/help", "/settings", "/profile", "/search", "/monitoring", "/approvals",
  "/curator", "/documents", "/diplomas", "/admissions", "/admissions/programs",
  "/admin", "/admin/users", "/admin/groups", "/admin/courses", "/admin/dictionaries",
  "/admin/generator", "/admin/structure", "/admin/departments", "/admin/import", "/admin/hemis",
  "/admin/audit", "/admin/settings", "/admin/bugs", "/admin/bounty", "/admin/updates", "/admin/orders",
  "/users/cmuv7m6bt00008o4xb2ru5k7p", "/verify/59cef4dc476b", "/apply",
];

function walkRoutes(dir, acc = []) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) walkRoutes(full, acc);
    else if (item === "route.ts") acc.push(full);
  }
  return acc;
}

function routePath(file) {
  return file
    .replace(/^src\/app/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\(.*?\)\//g, "/")
    .replace(/\[[^\]]+\]/g, (m) => m); // keep [param] as-is; we skip dynamic without values
}

const routeFiles = walkRoutes("src/app/api");
const routeList = routeFiles.map((f) => {
  const methods = [];
  const content = readFileSync(f, "utf8");
  for (const m of ["GET", "POST", "PATCH", "DELETE"]) {
    if (new RegExp(`export async function ${m}\\b`).test(content)) methods.push(m);
  }
  return { file: f, path: routePath(f), methods };
});

const report = { pages: [], consoleErrors: [], failedRequests: [], api: [], summary: {} };
const browser = await chromium.launch({ channel: "chrome" });

async function loginContext(email) {
  const api = await request.newContext({ baseURL: BASE });
  const csrf = await (await api.get("/api/csrf")).json();
  const res = await api.post("/api/auth/login", {
    headers: { "x-csrf-token": csrf.token },
    data: { email, password: "ttpu1234" },
  });
  if (!res.ok()) return null;
  const state = await api.storageState();
  await api.dispose();
  return state;
}

// Part A: sahifalar crawl (har rol)
for (const role of ROLES) {
  const email = role.email.includes("/") ? role.email.split("/")[1].trim() : role.email;
  const state = await loginContext(email);
  if (!state) { report.summary[`loginFail_${role.name}`] = email; continue; }
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let current = "";
  page.on("pageerror", (err) => report.consoleErrors.push({ role: role.name, page: current, type: "pageerror", message: String(err).slice(0, 200) }));
  page.on("console", (msg) => { if (msg.type() === "error") report.consoleErrors.push({ role: role.name, page: current, type: "console", message: msg.text().slice(0, 200) }); });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      report.failedRequests.push({ role: role.name, page: current, status: res.status(), url: res.url().replace(BASE, "") });
    }
  });
  for (const p of PAGES) {
    current = p;
    try {
      const res = await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(700);
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 5000)).catch(() => "");
      const status = res ? res.status() : 0;
      const finalUrl = page.url().replace(BASE, "");
      const hasError = /Nimadir xato ketdi|Sahifa topilmadi|Application error|xatolik yuz berdi/i.test(bodyText);
      if (status >= 400 || hasError) {
        report.pages.push({ role: role.name, page: p, status, finalUrl, error: hasError ? "error-boundary" : `http-${status}` });
      }
    } catch (err) {
      report.pages.push({ role: role.name, page: p, status: -1, finalUrl: "", error: String(err).split("\n")[0].slice(0, 160) });
    }
  }
  await ctx.close();
}

// Part B: API guard matritsa
const sessions = {};
for (const r of [["anon", null], ["STUDENT", "ai1s01@ttpu.uz"], ["TEACHER", "fizika@ttpu.uz"], ["ADMIN", "admin@ttpu.uz"]]) {
  const [label, email] = r;
  if (!email) { sessions[label] = { ctx: await request.newContext({ baseURL: BASE }), token: null }; continue; }
  const api = await request.newContext({ baseURL: BASE });
  const csrf = await (await api.get("/api/csrf")).json();
  await api.post("/api/auth/login", { headers: { "x-csrf-token": csrf.token }, data: { email, password: "ttpu1234" } });
  const csrf2 = await (await api.get("/api/csrf")).json();
  sessions[label] = { ctx: api, token: csrf2.token };
}

for (const route of routeList) {
  if (route.path.includes("[")) continue; // dinamiklarni o'tkazib yuboramiz
  for (const method of route.methods) {
    for (const [label, sess] of Object.entries(sessions)) {
      try {
        const res = await sess.ctx.fetch(`${BASE}${route.path}`, {
          method,
          headers: sess.token ? { "x-csrf-token": sess.token } : {},
          data: method === "GET" ? undefined : {},
          timeout: 15000,
        });
        const status = res.status();
        if (status >= 500) {
          report.api.push({ route: route.path, method, session: label, status, issue: "SERVER-500" });
        } else if (label === "anon" && method !== "GET" && status < 400) {
          report.api.push({ route: route.path, method, session: label, status, issue: "PUBLIC-WRITE?" });
        }
      } catch (err) {
        report.api.push({ route: route.path, method, session: label, status: -1, issue: "TIMEOUT/" + String(err).split("\n")[0].slice(0, 80) });
      }
    }
  }
}
for (const sess of Object.values(sessions)) await sess.ctx.dispose();

await browser.close();

report.summary.totalPagesChecked = ROLES.length * PAGES.length;
report.summary.pageFailures = report.pages.length;
report.summary.consoleErrors = report.consoleErrors.length;
report.summary.failedApiRequests = report.failedRequests.length;
report.summary.apiRoutes = routeList.length;
report.summary.apiIssues = report.api.length;
writeFileSync("/tmp/qa-report.json", JSON.stringify(report, null, 1));
console.log("TUGADI:", JSON.stringify(report.summary, null, 1));
