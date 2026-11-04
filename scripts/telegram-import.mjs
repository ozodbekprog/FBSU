#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const BATCH_SIZE = 150;
const HASH_COST = 10;
const EMAIL_DOMAIN = "telegram.local";
const MAX_NAME = 100;

function parseArgs(argv) {
  const args = { apply: false, file: "", manifest: "", rollback: "", limit: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--file") args.file = argv[++i] ?? "";
    else if (arg === "--manifest") args.manifest = argv[++i] ?? "";
    else if (arg === "--rollback") args.rollback = argv[++i] ?? "";
    else if (arg === "--limit") args.limit = Number(argv[++i] ?? 0) || 0;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Noma'lum argument: ${arg}`);
  }
  return args;
}

function usage() {
  console.log(`Foydalanish:
  node --env-file=.env.production.local scripts/telegram-import.mjs --file <members.json> [--apply] [--limit N] [--manifest path]
  node --env-file=.env.production.local scripts/telegram-import.mjs --rollback <manifest.json> [--apply]`);
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function memberName(member) {
  const full = clean([member.firstName, member.lastName].filter(Boolean).join(" "));
  const numeric = /^\d+$/.test(full.replace(/\s+/g, ""));
  if (full && !numeric) return full.slice(0, MAX_NAME);
  if (member.username) return `@${member.username}`.slice(0, MAX_NAME);
  return `Talaba ${member.telegramId}`.slice(0, MAX_NAME);
}

function memberEmail(member) {
  return `tg${member.telegramId}@${EMAIL_DOMAIN}`;
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function readMembers(file) {
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(payload) ? payload : payload.members;
  if (!Array.isArray(rows)) throw new Error("JSON ichida members massivi topilmadi");
  return { payload, rows };
}

function eligibleMembers(rows) {
  const seen = new Set();
  const out = [];
  let bots = 0;
  let deleted = 0;
  let invalid = 0;
  let duplicates = 0;
  for (const row of rows) {
    const id = clean(row.telegramId);
    if (!id || !/^\d+$/.test(id)) {
      invalid += 1;
      continue;
    }
    if (row.bot) {
      bots += 1;
      continue;
    }
    if (row.deleted) {
      deleted += 1;
      continue;
    }
    if (seen.has(id)) {
      duplicates += 1;
      continue;
    }
    seen.add(id);
    out.push({ ...row, telegramId: id });
  }
  return { members: out, bots, deleted, invalid, duplicates };
}

async function loadExisting(prisma, members) {
  const byTelegram = new Map();
  const byEmail = new Map();
  for (const group of chunks(members, 400)) {
    const ids = group.map((m) => m.telegramId);
    const emails = group.map(memberEmail);
    const [telegramUsers, emailUsers] = await Promise.all([
      prisma.user.findMany({
        where: { telegramId: { in: ids } },
        select: { id: true, telegramId: true, email: true, name: true, role: true },
      }),
      prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, telegramId: true, email: true, name: true, role: true },
      }),
    ]);
    for (const user of telegramUsers) if (user.telegramId) byTelegram.set(user.telegramId, user);
    for (const user of emailUsers) byEmail.set(user.email, user);
  }
  return { byTelegram, byEmail };
}

function selectCandidates(members, existing) {
  const create = [];
  const alreadyLinked = [];
  const emailConflicts = [];
  for (const member of members) {
    const linked = existing.byTelegram.get(member.telegramId);
    if (linked) {
      alreadyLinked.push({ member, user: linked });
      continue;
    }
    const conflict = existing.byEmail.get(memberEmail(member));
    if (conflict) {
      emailConflicts.push({ member, user: conflict });
      continue;
    }
    create.push(member);
  }
  return { create, alreadyLinked, emailConflicts };
}

async function applyImport(prisma, candidates, source) {
  const created = [];
  const failed = [];
  for (const group of chunks(candidates, BATCH_SIZE)) {
    const data = [];
    for (const member of group) {
      const passwordHash = await bcrypt.hash(randomBytes(18).toString("base64url"), HASH_COST);
      data.push({
        email: memberEmail(member),
        telegramId: member.telegramId,
        passwordHash,
        name: memberName(member),
        role: "STUDENT",
        isActive: true,
      });
    }
    try {
      const result = await prisma.user.createMany({ data, skipDuplicates: true });
      created.push({ requested: group.length, inserted: result.count });
    } catch (error) {
      failed.push({ requested: group.length, error: error instanceof Error ? error.message : String(error) });
    }
    const done = created.reduce((sum, item) => sum + item.requested, 0);
    console.log(`  batch: ${done}/${candidates.length}`);
  }

  const telegramIds = candidates.map((m) => m.telegramId);
  const users = [];
  for (const group of chunks(telegramIds, 400)) {
    const rows = await prisma.user.findMany({
      where: { telegramId: { in: group } },
      select: { id: true, telegramId: true, email: true, name: true, role: true, createdAt: true },
    });
    users.push(...rows);
  }

  const manifest = {
    batchId: `tg-import-${new Date().toISOString().replace(/[:.]/g, "-")}`,
    createdAt: new Date().toISOString(),
    source,
    options: { role: "STUDENT", groupId: null, emailDomain: EMAIL_DOMAIN },
    counts: {
      candidates: candidates.length,
      inserted: created.reduce((sum, item) => sum + item.inserted, 0),
      verified: users.length,
      failedBatches: failed.length,
    },
    failed,
    users,
  };
  return manifest;
}

async function rollback(prisma, manifestPath, apply) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const ids = (manifest.users ?? []).map((user) => user.id).filter(Boolean);
  if (ids.length === 0) {
    console.log("Manifestda foydalanuvchi ID'lari yo'q.");
    return;
  }
  const where = { id: { in: ids }, email: { endsWith: `@${EMAIL_DOMAIN}` } };
  const found = await prisma.user.count({ where });
  console.log(`O'chiriladi: ${found} ta akkaunt (${ids.length} ta ID tekshirildi)`);
  if (!apply) {
    console.log("Dry-run: o'chirish uchun --apply qo'shing.");
    return;
  }
  const result = await prisma.user.deleteMany({ where });
  console.log(`O'chirildi: ${result.count} ta akkaunt`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (args.rollback) {
    const prisma = new PrismaClient();
    try {
      await rollback(prisma, args.rollback, args.apply);
    } finally {
      await prisma.$disconnect();
    }
    return;
  }
  if (!args.file) {
    usage();
    throw new Error("--file ko'rsatilmagan");
  }

  const sourcePath = path.resolve(args.file);
  const { payload, rows } = readMembers(sourcePath);
  const { members, bots, deleted, invalid, duplicates } = eligibleMembers(rows);
  const limited = args.limit > 0 ? members.slice(0, args.limit) : members;

  const prisma = new PrismaClient();
  try {
    const existing = await loadExisting(prisma, limited);
    const { create, alreadyLinked, emailConflicts } = selectCandidates(limited, existing);

    console.log(JSON.stringify({
      mode: args.apply ? "apply" : "dry-run",
      source: sourcePath,
      chat: payload.chatTitle ?? null,
      exportedAt: payload.exportedAt ?? null,
      totalRows: rows.length,
      eligible: limited.length,
      botsSkipped: bots,
      deletedSkipped: deleted,
      invalidSkipped: invalid,
      duplicateSkipped: duplicates,
      alreadyLinked: alreadyLinked.length,
      emailConflicts: emailConflicts.length,
      toCreate: create.length,
    }, null, 2));

    if (!args.apply) {
      console.log("\nDry-run yakunlandi. Yozish uchun --apply qo'shing.");
      return;
    }

    if (create.length === 0) {
      console.log("Yaratish uchun yangi akkaunt yo'q.");
      return;
    }

    const manifest = await applyImport(prisma, create, {
      file: sourcePath,
      chatId: payload.chatId ?? null,
      chatTitle: payload.chatTitle ?? null,
      exportedAt: payload.exportedAt ?? null,
    });

    const manifestPath = path.resolve(
      args.manifest || path.join(path.dirname(sourcePath), `${manifest.batchId}.json`),
    );
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify(manifest.counts, null, 2));
    console.log(`Manifest: ${manifestPath}`);
    if (manifest.counts.verified !== manifest.counts.inserted) {
      console.error("OGOHLANTIRISH: inserted va verified soni mos emas.");
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Xato: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
