#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const apply = process.argv.includes("--apply");
const listFile = process.argv[2];
if (!listFile) {
  console.error("Foydalanish: node scripts/events-migrate.mjs <fayllar-ro'yxati> [--apply]");
  process.exit(1);
}

const catalogText = readFileSync(new URL("../src/modules/events/catalog.ts", import.meta.url), "utf8");
const eventNames = new Set(
  [...catalogText.matchAll(/^\s*"?([A-Za-z][A-Za-z0-9_.-]+)"?:\s*\{\s*category:/gm)].map((m) => m[1]),
);

const files = readFileSync(listFile, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const IMPORT_OLD = 'import { logAudit } from "@/server/audit";';
const IMPORT_NEW = 'import { recordEvent } from "@/modules/events/record";';

function findBlockEnd(text, openIndex) {
  let depth = 0;
  let inString = null;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

let convertedFiles = 0;
let convertedCalls = 0;
const skipped = [];

for (const file of files) {
  let text = readFileSync(file, "utf8");
  if (!text.includes(IMPORT_OLD)) {
    skipped.push(`${file} (import formati boshqa)`);
    continue;
  }

  const occurrences = [];
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf("await logAudit(", searchFrom);
    if (idx === -1) break;
    occurrences.push(idx);
    searchFrom = idx + 1;
  }
  if (occurrences.length === 0) {
    skipped.push(`${file} (await logAudit topilmadi)`);
    continue;
  }

  let ok = true;
  const replacements = [];
  for (const idx of occurrences) {
    const openParen = text.indexOf("(", idx);
    const openBrace = text.indexOf("{", openParen);
    if (openBrace === -1 || text.slice(openParen + 1, openBrace).trim() !== "") {
      ok = false;
      break;
    }
    const closeBrace = findBlockEnd(text, openBrace);
    if (closeBrace === -1) {
      ok = false;
      break;
    }
    const objectText = text.slice(openBrace + 1, closeBrace);
    const actionMatch = objectText.match(/action:\s*"([^"]+)"/);
    const actorMatch = objectText.match(/actorId:\s*([^,\n]+?),?\s*$/m) ?? objectText.match(/actorId:\s*([^,\n]+),/);
    if (!actionMatch || !actorMatch) {
      ok = false;
      break;
    }
    const eventName = actionMatch[1];
    if (!eventNames.has(eventName)) {
      ok = false;
      break;
    }
    const lines = objectText.split("\n");
    if (lines.length === 1) {
      ok = false;
      break;
    }
    const keptLines = lines.filter((line) => {
      const trimmed = line.trim();
      return !(trimmed.startsWith("actorId:") || trimmed.startsWith("action:"));
    });
    const actorId = actorMatch[1].replace(/,$/, "").trim();
    replacements.push({
      start: idx,
      end: closeBrace + 1,
      text: `await recordEvent(${actorId}, "${eventName}", {${keptLines.join("\n")}}`,
    });
  }

  if (!ok) {
    skipped.push(`${file} (mos kelmaydigan chaqiruv)`);
    continue;
  }

  for (const replacement of replacements.reverse()) {
    text = text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end);
  }
  text = text.replace(IMPORT_OLD, IMPORT_NEW);

  if (apply) {
    writeFileSync(file, text);
  }
  convertedFiles += 1;
  convertedCalls += replacements.length;
}

console.log(`${apply ? "O'zgartirildi" : "Dry-run"}: ${convertedFiles} fayl, ${convertedCalls} chaqiruv`);
if (skipped.length > 0) {
  console.log(`O'tkazib yuborildi (${skipped.length}):`);
  for (const item of skipped) console.log(`  - ${item}`);
}
