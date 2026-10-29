#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const TRIGGER_NAME = "protect_owner_user_trigger";
const FUNCTION_NAME = "protect_owner_user";

function printHelp() {
  console.log(`
OWNER akkaunt va himoya triggeri holatini tekshirish.

Ishlatish:
  node scripts/security-check.mjs

Tekshiruvlar:
  owner      kamida bitta aktiv OWNER rolidagi foydalanuvchi mavjudligi
  trigger    "User" jadvalidagi ${TRIGGER_NAME} triggeri mavjudligi
  function   ${FUNCTION_NAME}() trigger funksiyasi mavjudligi

Env (ixtiyoriy, FAIL bo'lganda ogohlantirish uchun):
  TELEGRAM_BOT_TOKEN     bot tokeni
  OWNER_TELEGRAM_ID      ogohlantirish qabul qiluvchisi

Natija:
  Barcha tekshiruvlar OK bo'lsa chiqish kodi 0, aks holda 1.
`);
}

async function notifyTelegram(lines) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.OWNER_TELEGRAM_ID?.trim();
  if (!token || !chatId) return;

  try {
    const text = [
      "FBSU xavfsizlik tekshiruvi: FAIL",
      ...lines,
      new Date().toISOString(),
    ].join("\n");

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch {
    return;
  }
}

if (process.argv.slice(2).includes("--help") || process.argv.slice(2).includes("-h")) {
  printHelp();
  process.exit(0);
}

const prisma = new PrismaClient();

async function main() {
  const ownerCount = await prisma.user.count({ where: { role: "OWNER", isActive: true } });
  const triggerRows = await prisma.$queryRaw`
    SELECT tgname FROM pg_trigger WHERE tgname = ${TRIGGER_NAME}
  `;
  const functionRows = await prisma.$queryRaw`
    SELECT proname FROM pg_proc WHERE proname = ${FUNCTION_NAME}
  `;

  const ownerOk = ownerCount >= 1;
  const triggerOk = triggerRows.length > 0;
  const functionOk = functionRows.length > 0;

  console.log("Xavfsizlik tekshiruvi");
  console.log(`owner: ${ownerOk ? "OK" : "FAIL"} (aktiv OWNER: ${ownerCount})`);
  console.log(`trigger: ${triggerOk ? "OK" : "FAIL"} (${TRIGGER_NAME})`);
  console.log(`function: ${functionOk ? "OK" : "FAIL"} (${FUNCTION_NAME})`);

  const failures = [];
  if (!ownerOk) failures.push(`owner: aktiv OWNER akkaunt topilmadi (${ownerCount})`);
  if (!triggerOk) failures.push(`trigger: ${TRIGGER_NAME} topilmadi`);
  if (!functionOk) failures.push(`function: ${FUNCTION_NAME} topilmadi`);

  if (failures.length > 0) {
    await notifyTelegram(failures);
    console.log("\nNatija: FAIL");
    process.exitCode = 1;
    return;
  }

  console.log("\nNatija: OK");
}

try {
  await main();
} catch (error) {
  console.error(`Xato: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
