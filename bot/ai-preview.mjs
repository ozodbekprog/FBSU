import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { securityEventCount } from "./ai-core.mjs";
import {
  buildDeanReport,
  buildSecurityAlert,
  buildStudentAlert,
  buildTeacherReport,
  collectDeanFacts,
  collectSecurityEvents,
  collectStudentFacts,
  collectTeacherFacts,
} from "./insights.mjs";

const BOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(BOT_DIR, "..");

for (const file of [".env", ".env.local"]) {
  try {
    if (typeof process.loadEnvFile === "function") process.loadEnvFile(path.join(ROOT_DIR, file));
  } catch {}
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? "") : "";
}

const email = argValue("--email").trim();
const sinceArg = argValue("--since").trim();
const security = process.argv.includes("--security");
const withFacts = process.argv.includes("--facts");
const noAi = process.argv.includes("--no-ai");

if (!email && !security) {
  console.error("Ishlatish:");
  console.error("  node bot/ai-preview.mjs --email student@ttpu.uz [--facts] [--no-ai]");
  console.error("  node bot/ai-preview.mjs --security [--since 2026-11-03T00:00] [--no-ai]");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Xato: DATABASE_URL topilmadi (.env yoki muhitda bering).");
  process.exit(1);
}

if (noAi) {
  delete process.env.AI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
}

function printFacts(facts) {
  if (!withFacts) return;
  console.log("--- facts ---");
  console.log(JSON.stringify(facts, null, 2));
  console.log("--- text ---");
}

async function previewUser(db, now) {
  const user = await db.user.findUnique({ where: { email }, include: { group: true } });
  if (!user) {
    console.error(`Foydalanuvchi topilmadi: ${email}`);
    process.exit(1);
  }
  console.log(`Foydalanuvchi: ${user.name} <${user.email}> — ${user.role}`);
  let facts;
  let text;
  if (user.role === "STUDENT") {
    facts = await collectStudentFacts(db, user, now);
    text = await buildStudentAlert(db, user, now);
  } else if (user.role === "TEACHER") {
    facts = await collectTeacherFacts(db, user, now);
    text = await buildTeacherReport(db, user, now);
  } else if (user.role === "DEKAN") {
    facts = await collectDeanFacts(db, user, now);
    text = await buildDeanReport(db, user, now);
  } else {
    console.error(`Bu rol uchun AI tahlil yo'q: ${user.role}`);
    process.exit(1);
  }
  printFacts(facts);
  console.log(text ?? "Ogohlantirish yo'q.");
}

async function previewSecurity(db, now) {
  const since = sinceArg ? new Date(sinceArg) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (Number.isNaN(since.getTime())) {
    console.error(`Noto'g'ri --since qiymati: ${sinceArg}`);
    process.exit(1);
  }
  const events = await collectSecurityEvents(db, since, now);
  console.log(`Oraliq: ${since.toISOString()} — ${now.toISOString()}`);
  console.log(`Hodisalar: ${securityEventCount(events)}`);
  printFacts(events);
  const text = await buildSecurityAlert(events, since, now);
  console.log(text ?? "SKIP (jiddiy xavf yo'q).");
}

const db = new PrismaClient();
try {
  const now = new Date();
  if (security) await previewSecurity(db, now);
  else await previewUser(db, now);
} finally {
  await db.$disconnect();
}
