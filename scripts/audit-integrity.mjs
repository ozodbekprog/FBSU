#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const name of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(root, name), "utf8");
      for (const line of text.split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        const key = match[1];
        const raw = match[2].trim().replace(/^["']|["']$/g, "");
        if (process.env[key] === undefined) process.env[key] = raw;
      }
      if (process.env.DATABASE_URL) return;
    } catch {}
  }
}

function normalize(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(normalize);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) result[key] = normalize(item);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value) {
  const encoded = JSON.stringify(normalize(value));
  return encoded === undefined ? "null" : encoded;
}

export function computeHash(row) {
  const payload = canonicalJson({
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  });
  return createHash("sha256").update(`${row.prevHash ?? ""}|${payload}`).digest("hex");
}

export function verifyRows(rows) {
  const problems = [];
  let verified = 0;
  let unhashed = 0;
  let restarts = 0;
  let prevHash = null;

  rows.forEach((row, index) => {
    if (!row.hash) {
      unhashed += 1;
      return;
    }
    if (row.prevHash !== prevHash) {
      if (row.prevHash === null) {
        restarts += 1;
      } else {
        problems.push(
          `#${index} id=${row.id}: prevHash mos emas (kutilgan ${prevHash ?? "null"}, topilgan ${row.prevHash})`,
        );
      }
    }
    const expected = computeHash(row);
    if (expected !== row.hash) {
      problems.push(`#${index} id=${row.id}: hash buzilgan (kutilgan ${expected}, topilgan ${row.hash})`);
    }
    prevHash = row.hash;
    verified += 1;
  });

  return { total: rows.length, verified, unhashed, restarts, problems };
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error("FAIL: DATABASE_URL topilmadi");
    return 1;
  }
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.auditLog.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        actorId: true,
        action: true,
        entity: true,
        entityId: true,
        meta: true,
        prevHash: true,
        hash: true,
        createdAt: true,
      },
    });

    const report = verifyRows(rows);
    console.log(`Jami yozuv: ${report.total}`);
    console.log(`Tekshirilgan (hashed): ${report.verified}`);
    console.log(`unhashed (legacy): ${report.unhashed}`);
    console.log(`zanjir qayta boshlanishi: ${report.restarts}`);

    if (report.problems.length > 0) {
      console.error(`FAIL: ${report.problems.length} ta buzilish`);
      for (const problem of report.problems.slice(0, 50)) console.error(`  ${problem}`);
      if (report.problems.length > 50) console.error(`  ... yana ${report.problems.length - 50} ta`);
      return 1;
    }
    console.log("OK: zanjir buzilmagan");
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then((code) => {
    process.exitCode = code;
  });
}
