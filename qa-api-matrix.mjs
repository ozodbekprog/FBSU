import { request } from "playwright";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";

function walkRoutes(dir, acc = []) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) walkRoutes(full, acc);
    else if (item === "route.ts") acc.push(full);
  }
  return acc;
}
const routeList = walkRoutes("src/app/api").map((f) => {
  const content = readFileSync(f, "utf8");
  const methods = ["GET", "POST", "PATCH", "DELETE"].filter((m) => new RegExp(`export async function ${m}\\b`).test(content));
  const path = f.replace(/^src\/app/, "").replace(/\/route\.ts$/, "").replace(/\(.*?\)\//g, "/");
  return { path, methods };
});

const issues = [];
const sessions = {};
for (const [label, email] of [["anon", null], ["STUDENT", "ai1s01@ttpu.uz"], ["TEACHER", "fizika@ttpu.uz"], ["ADMIN", "admin@ttpu.uz"]]) {
  if (!email) { sessions[label] = { ctx: await request.newContext({ baseURL: BASE }), token: null }; continue; }
  const api = await request.newContext({ baseURL: BASE });
  const csrf = await (await api.get("/api/csrf")).json();
  await api.post("/api/auth/login", { headers: { "x-csrf-token": csrf.token }, data: { email, password: "ttpu1234" } });
  const csrf2 = await (await api.get("/api/csrf")).json();
  sessions[label] = { ctx: api, token: csrf2.token };
}

let checked = 0;
for (const route of routeList) {
  if (route.path.includes("[")) continue;
  for (const method of route.methods) {
    for (const [label, sess] of Object.entries(sessions)) {
      try {
        const res = await sess.ctx.fetch(`${BASE}${route.path}`, {
          method,
          headers: sess.token ? { "x-csrf-token": sess.token } : {},
          data: method === "GET" ? undefined : {},
          timeout: 12000,
        });
        const status = res.status();
        checked++;
        if (status >= 500) issues.push({ route: route.path, method, session: label, status, issue: "SERVER-500" });
        else if (label === "anon" && method !== "GET" && status < 400) issues.push({ route: route.path, method, session: label, status, issue: "PUBLIC-WRITE?" });
      } catch (err) {
        checked++;
        issues.push({ route: route.path, method, session: label, status: -1, issue: "TIMEOUT" });
      }
    }
  }
}
for (const sess of Object.values(sessions)) await sess.ctx.dispose();
writeFileSync("/tmp/qa-api-report.json", JSON.stringify({ checked, issues }, null, 1));
console.log(`API MATRIX TUGADI: ${checked} tekshiruv, ${issues.length} muammo`);
