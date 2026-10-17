#!/usr/bin/env node
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 30;
const BCRYPT_COST = 12;

function printHelp() {
  console.log(`
OWNER akkauntni yaratish yoki tiklash.

Ishlatish:
  OWNER_EMAIL=egasi@example.com OWNER_RECOVERY_SECRET=... node scripts/owner-recovery.mjs
  OWNER_EMAIL=... OWNER_RECOVERY_SECRET=... node scripts/owner-recovery.mjs --password <parol>

Env:
  OWNER_EMAIL            majburiy — OWNER akkaunt emaili
  OWNER_RECOVERY_SECRET  majburiy — server env'dagi tasdiq siri (skript uni faqat tekshiradi)
  TELEGRAM_BOT_TOKEN     ixtiyoriy — berilsa, recovery haqida Telegram ogohlantirish yuboriladi
  OWNER_TELEGRAM_ID      ixtiyoriy — ogohlantirish qabul qiluvchisi (token bilan birga kerak)

Bayroqlar:
  --password <p>  aniq parol berish (kamida ${MIN_PASSWORD_LENGTH} belgi)
  --help          shu qo'llanma

Xavfsizlik:
  - Parol siyosati: kamida ${MIN_PASSWORD_LENGTH} belgi. Berilmasa
    crypto.randomBytes(24) asosida ~32 belgili parol generatsiya qilinadi.
  - Barcha DB yozuvlari bitta tranzaksiyada bajariladi va boshida
    SET LOCAL app.allow_owner_write = 'on' qo'llanadi. "User" jadvalidagi OWNER
    qatorini UPDATE/DELETE qilish DB trigger bilan faqat shu sozlama yoqilganda
    ruxsat etiladi — aks holda EXCEPTION.
  - Parol hech qachon logga yozilmaydi; generatsiya qilinganda faqat bir marta
    konsolga chiqadi.
  - Tranzaksiyadan keyin, TELEGRAM_BOT_TOKEN va OWNER_TELEGRAM_ID berilgan bo'lsa,
    Telegram orqali qisqa ogohlantirish yuboriladi (token yo'q bo'lsa jim o'tkaziladi).
`);
}

function fail(message) {
  console.error(`Xato: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

let explicitPassword = null;
const passwordIndex = args.findIndex((arg) => arg === "--password");

if (passwordIndex !== -1) {
  const value = args[passwordIndex + 1];
  if (!value || value.startsWith("--")) fail("--password uchun qiymat berilmadi");
  explicitPassword = value;
}

const email = process.env.OWNER_EMAIL?.trim();
const secret = process.env.OWNER_RECOVERY_SECRET?.trim();

if (!email) fail("OWNER_EMAIL env o'zgaruvchisi majburiy");
if (!secret) fail("OWNER_RECOVERY_SECRET env o'zgaruvchisi majburiy");

const generated = explicitPassword === null;
const password = generated ? crypto.randomBytes(24).toString("base64url") : explicitPassword;

if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
}

const prisma = new PrismaClient();

async function notifyTelegram({ userId, mode }) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.OWNER_TELEGRAM_ID?.trim();
  if (!token || !chatId) return;

  try {
    const text = `OWNER recovery ishlatildi: ${email}, ${mode}, ${new Date().toISOString()}`;
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!response.ok) {
      console.warn(`Ogohlantirish: Telegram javobi ${response.status} (userId: ${userId})`);
    }
  } catch (error) {
    console.warn(`Ogohlantirish: Telegram xabari yuborilmadi (${error instanceof Error ? error.message : String(error)})`);
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const { user, mode } = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL app.allow_owner_write = 'on'");

    const existing = await tx.user.findUnique({ where: { email } });

    const saved = existing
      ? await tx.user.update({
          where: { email },
          data: {
            role: "OWNER",
            isActive: true,
            passwordHash,
            sessionEpoch: { increment: 1 },
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: "Egasi",
            role: "OWNER",
            isActive: true,
            passwordHash,
          },
        });

    await tx.auditLog.create({
      data: {
        action: "system.ownerRecovery",
        entity: "User",
        entityId: saved.id,
        meta: { email, mode: existing ? "updated" : "created" },
      },
    });

    return { user: saved, mode: existing ? "updated" : "created" };
  });

  await notifyTelegram({ userId: user.id, mode });

  console.log(`OWNER ${mode === "updated" ? "yangilandi" : "yaratildi"}.`);
  console.log(`Email: ${user.email}`);
  if (generated) {
    console.log(`Parol: ${password}`);
    console.log("DIQQAT: bu parolni xavfsiz saqlang, qayta ko'rsatilmaydi.");
  } else {
    console.log("Parol: (--password orqali berildi, ko'rsatilmaydi)");
  }
  console.log(`Audit: system.ownerRecovery -> User:${user.id}`);
}

try {
  await main();
} catch (error) {
  console.error(`Xato: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.$disconnect();
