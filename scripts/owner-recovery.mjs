#!/usr/bin/env node
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 12;
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

Bayroqlar:
  --password <p>  aniq parol berish (kamida ${MIN_PASSWORD_LENGTH} belgi)
  --help          shu qo'llanma

Eslatma: parol generatsiya qilinsa, u faqat bir marta konsolga chiqadi.
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
const password = generated ? crypto.randomBytes(12).toString("base64url") : explicitPassword;

if (password.length < MIN_PASSWORD_LENGTH) {
  fail(`parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak`);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          role: "OWNER",
          isActive: true,
          passwordHash,
          sessionEpoch: { increment: 1 },
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name: "Egasi",
          role: "OWNER",
          isActive: true,
          passwordHash,
        },
      });

  await prisma.auditLog.create({
    data: {
      action: "system.ownerRecovery",
      entity: "User",
      entityId: user.id,
      meta: { email, mode: existing ? "updated" : "created" },
    },
  });

  console.log(`OWNER ${existing ? "yangilandi" : "yaratildi"}.`);
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
