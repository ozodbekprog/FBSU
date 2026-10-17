#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_IGNORE,
  DEFAULT_PATTERNS,
  buildManifest,
  diffManifest,
  hashFile,
  selfTest,
  verifyManifestSignature,
} from "./lib/integrity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_REPORT = 20;

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const text = readFileSync(join(root, name), "utf8");
      for (const line of text.split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!match) continue;
        const key = match[1];
        const raw = match[2].trim().replace(/^["']|["']$/g, "");
        if (process.env[key] === undefined) process.env[key] = raw;
      }
    } catch {}
  }
}

function printHelp() {
  console.log(`
Kod yaxlitligini tekshirish va imzolangan paketdan avtomatik tiklash.

Ishlatish:
  OWNER_INTEGRITY_SECRET=... node scripts/integrity-heal.mjs [--dry-run] [--self-test]

Variantlar:
  --dry-run   faqat hisobot, hech narsa tiklanmaydi
  --self-test lib funksiyalarini vaqtinchalik papkada tekshiradi
  --help      shu yordam

Env:
  OWNER_INTEGRITY_SECRET     majburiy, manifest imzosini tekshirish uchun
  INTEGRITY_ARTIFACT_URL     tiklash uchun tar.gz manzili (http/https)
  INTEGRITY_ARTIFACT_SHA256  ixtiyoriy, yuklangan arxivning sha256 qiymati
  INTEGRITY_RESTART_CMD      ixtiyoriy, tiklangandan keyin restart buyrug'i
  TELEGRAM_BOT_TOKEN         ixtiyoriy, alert uchun bot tokeni
  OWNER_TELEGRAM_ID          ixtiyoriy, alert qabul qiluvchi chat id

Natija:
  0 — farq yo'q yoki tiklandi
  1 — imzo buzilgan, manifest yo'q yoki tiklab bo'lmadi
`);
}

function formatList(label, items) {
  if (items.length === 0) return [];
  const shown = items.slice(0, MAX_REPORT);
  const lines = [`${label} (${items.length}):`, ...shown.map((item) => `  - ${item}`)];
  if (items.length > shown.length) lines.push(`  ... yana ${items.length - shown.length} ta`);
  return lines;
}

async function notifyTelegram(lines) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.OWNER_TELEGRAM_ID?.trim();
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function readSignedManifest(dir) {
  const manifestPath = join(dir, "manifest.json");
  const signaturePath = join(dir, "manifest.sig");
  if (!existsSync(manifestPath) || !existsSync(signaturePath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const signature = readFileSync(signaturePath, "utf8").trim();
  return { manifest, signature };
}

function safeJoin(base, rel) {
  const normalizedBase = resolve(base);
  const target = resolve(normalizedBase, rel);
  if (target === normalizedBase || !target.startsWith(`${normalizedBase}${sep}`)) return null;
  return target;
}

async function downloadArtifact(tempDir) {
  const url = process.env.INTEGRITY_ARTIFACT_URL?.trim();
  if (!url) throw new Error("INTEGRITY_ARTIFACT_URL berilmagan");
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`artifact yuklanmadi: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const expected = process.env.INTEGRITY_ARTIFACT_SHA256?.trim().toLowerCase();
  if (expected) {
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (actual !== expected) throw new Error(`artifact sha256 mos emas (kutilgan ${expected}, topilgan ${actual})`);
  }
  const archivePath = join(tempDir, "artifact.tar.gz");
  writeFileSync(archivePath, buffer);
  return archivePath;
}

function extractArtifact(archivePath, tempDir, targets) {
  const extractDir = join(tempDir, "artifact");
  mkdirSync(extractDir, { recursive: true });
  execFileSync("tar", ["-xzf", archivePath, "-C", extractDir], { stdio: "pipe" });
  const probe = targets[0];
  if (!probe) return extractDir;
  if (existsSync(join(extractDir, probe))) return extractDir;
  const entries = readdirSync(extractDir);
  if (entries.length === 1) {
    const single = join(extractDir, entries[0]);
    if (statSync(single).isDirectory() && existsSync(join(single, probe))) return single;
  }
  return extractDir;
}

async function restoreTargets({ sourceBase, appDir, targets, expected }) {
  const restored = [];
  const failures = [];
  for (const rel of targets) {
    const source = safeJoin(sourceBase, rel);
    const target = safeJoin(appDir, rel);
    if (!source || !target) {
      failures.push(`${rel}: xavfli yo'l`);
      continue;
    }
    if (!existsSync(source) || !statSync(source).isFile()) {
      failures.push(`${rel}: artifact ichida topilmadi`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    const actual = await hashFile(target);
    if (actual !== expected[rel]) {
      failures.push(`${rel}: tiklangandan keyin hash mos emas`);
      continue;
    }
    restored.push(rel);
  }
  return { restored, failures };
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return 0;
  }
  if (args.includes("--self-test")) {
    const result = await selfTest();
    for (const line of result.lines) console.log(line);
    console.log(result.ok ? "SELF-TEST: PASS" : "SELF-TEST: FAIL");
    return result.ok ? 0 : 1;
  }

  const allowed = new Set(["--dry-run"]);
  const unknown = args.filter((arg) => !allowed.has(arg));
  if (unknown.length > 0) {
    console.error(`FAIL: noma'lum argument(lar): ${unknown.join(", ")}`);
    return 1;
  }
  const dryRun = args.includes("--dry-run");

  const secret = process.env.OWNER_INTEGRITY_SECRET?.trim();
  if (!secret) {
    console.error("FAIL: OWNER_INTEGRITY_SECRET majburiy (fail-closed)");
    await notifyTelegram(["FBSU yaxlitlik: FAIL", "OWNER_INTEGRITY_SECRET berilmagan — tekshiruv bajarilmadi."]);
    return 1;
  }

  const integrityDir = join(root, ".integrity");
  let signed;
  try {
    signed = readSignedManifest(integrityDir);
  } catch (error) {
    console.error(`FAIL: manifest o'qilmadi: ${error instanceof Error ? error.message : String(error)}`);
    await notifyTelegram(["FBSU yaxlitlik: FAIL", "manifest.json o'qilmadi yoki JSON buzilgan."]);
    return 1;
  }

  if (!signed) {
    console.error(`FAIL: ${integrityDir} ichida manifest.json yoki manifest.sig yo'q`);
    await notifyTelegram(["FBSU yaxlitlik: FAIL", "manifest.json yoki manifest.sig topilmadi."]);
    return 1;
  }

  const { manifest, signature } = signed;
  if (!verifyManifestSignature(manifest, signature, secret)) {
    console.error("FAIL: manifest imzosi mos emas — fail-closed (fayllar tekshirilmadi)");
    console.error("Sabab: secret noto'g'ri yoki manifest.json o'zgartirilgan.");
    await notifyTelegram([
      "FBSU yaxlitlik: FAIL (fail-closed)",
      "Manifest imzosi mos emas — tiklash bajarilmadi.",
      `vaqt: ${new Date().toISOString()}`,
    ]);
    return 1;
  }

  const appDir = typeof manifest.appDir === "string" && manifest.appDir.length > 0 ? resolve(manifest.appDir) : root;
  if (!existsSync(appDir)) {
    console.error(`FAIL: appDir topilmadi: ${appDir}`);
    await notifyTelegram(["FBSU yaxlitlik: FAIL", `appDir topilmadi: ${appDir}`]);
    return 1;
  }

  const patterns = Array.isArray(manifest.patterns) && manifest.patterns.length > 0 ? manifest.patterns : DEFAULT_PATTERNS;
  const ignore = Array.isArray(manifest.ignore) ? manifest.ignore : DEFAULT_IGNORE;
  const expected = manifest.files && typeof manifest.files === "object" ? manifest.files : {};
  const actualManifest = await buildManifest(appDir, patterns, ignore);
  const diff = diffManifest(expected, actualManifest.files);

  if (diff.changed.length === 0 && diff.missing.length === 0 && diff.extra.length === 0) {
    return 0;
  }

  const header = [
    "FBSU yaxlitlik: OGOHLANTIRISH — kod o'zgargan",
    `appDir: ${appDir}`,
    `changed: ${diff.changed.length}, missing: ${diff.missing.length}, extra: ${diff.extra.length}`,
    `vaqt: ${new Date().toISOString()}`,
  ];
  const report = [
    ...header,
    ...formatList("changed", diff.changed),
    ...formatList("missing", diff.missing),
    ...formatList("extra", diff.extra),
  ];

  console.log(header[0]);
  for (const line of report.slice(1)) console.log(line);
  await notifyTelegram(report);

  const targets = [...new Set([...diff.changed, ...diff.missing])].sort();
  if (targets.length === 0) {
    console.log("Faqat extra fayllar bor — ular o'chirilmaydi, qo'lda ko'rib chiqing.");
    return 0;
  }

  if (dryRun) {
    console.log(`--dry-run: ${targets.length} ta fayl tiklanmadi (hisobot).`);
    return 0;
  }

  if (!process.env.INTEGRITY_ARTIFACT_URL?.trim()) {
    console.error("FAIL: INTEGRITY_ARTIFACT_URL berilmagan — tiklab bo'lmadi.");
    return 1;
  }

  let tempDir = null;
  let restored = [];
  let failures = [];
  try {
    tempDir = mkdtempSync(join(tmpdir(), "fbsu-heal-"));
    const archivePath = await downloadArtifact(tempDir);
    const sourceBase = extractArtifact(archivePath, tempDir, targets);
    const result = await restoreTargets({ sourceBase, appDir, targets, expected });
    restored = result.restored;
    failures = result.failures;
  } catch (error) {
    console.error(`FAIL: artifact orqali tiklash xatosi: ${error instanceof Error ? error.message : String(error)}`);
    failures = [error instanceof Error ? error.message : String(error)];
  } finally {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(`Tiklandi: ${restored.length}/${targets.length}`);
  if (failures.length > 0) {
    for (const line of formatList("tiklolmadi", failures)) console.error(line);
  }

  if (restored.length > 0) {
    const restartCmd = process.env.INTEGRITY_RESTART_CMD?.trim();
    if (restartCmd) {
      try {
        const output = execSync(restartCmd, { encoding: "utf8", timeout: 120000, stdio: "pipe" });
        console.log(`Restart: OK (${restartCmd})`);
        if (output.trim()) console.log(output.trim().slice(0, 2000));
      } catch (error) {
        console.error(`Restart FAIL: ${restartCmd}`);
        const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
        if (stderr) console.error(stderr.slice(0, 2000));
        failures.push("restart bajarilmadi");
      }
    }
  }

  return failures.length === 0 && restored.length === targets.length ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
