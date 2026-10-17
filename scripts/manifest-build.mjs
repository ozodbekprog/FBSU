#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_IGNORE,
  DEFAULT_PATTERNS,
  buildManifest,
  canonicalJson,
  signManifest,
} from "./lib/integrity.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { dirs: null, out: ".integrity", help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dirs") {
      options.dirs = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--dirs=")) {
      options.dirs = arg.slice("--dirs=".length);
    } else if (arg === "--out") {
      options.out = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
    } else {
      throw new Error(`Noma'lum argument: ${arg}`);
    }
  }
  return options;
}

function ensureGitignore(entry = ".integrity/") {
  const file = join(root, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = text.split(/\r?\n/);
  if (lines.includes(entry) || lines.includes(entry.replace(/\/$/, ""))) return false;
  const next = text.length === 0 || text.endsWith("\n") ? `${text}${entry}\n` : `${text}\n${entry}\n`;
  writeFileSync(file, next);
  return true;
}

function printHelp() {
  console.log(`
Kod yaxlitligi manifestini yaratish va imzolash.

Ishlatish:
  OWNER_INTEGRITY_SECRET=... node scripts/manifest-build.mjs [--dirs src,prisma] [--out .integrity]

Variantlar:
  --dirs   manifestga kiritiladigan yo'llar (vergul bilan). Berilmasa default ro'yxat.
  --out    chiqish papkasi (default: .integrity)
  --help   shu yordam

Default yo'llar: ${DEFAULT_PATTERNS.join(", ")}

Natija:
  <out>/manifest.json  { appDir, files, createdAt, patterns, ignore }
  <out>/manifest.sig   HMAC-SHA256 hex (OWNER_INTEGRITY_SECRET)
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }

  if (!options.out || options.out.trim().length === 0) {
    console.error("FAIL: --out bo'sh bo'lishi mumkin emas");
    return 1;
  }

  let patterns = DEFAULT_PATTERNS;
  if (options.dirs !== null) {
    patterns = options.dirs.split(",").map((item) => item.trim()).filter(Boolean);
    if (patterns.length === 0) {
      console.error("FAIL: --dirs bo'sh bo'lishi mumkin emas");
      return 1;
    }
  }

  const secret = process.env.OWNER_INTEGRITY_SECRET?.trim();
  if (!secret) {
    console.error("FAIL: OWNER_INTEGRITY_SECRET majburiy (manifest imzosi uchun)");
    return 1;
  }

  const manifest = await buildManifest(root, patterns, DEFAULT_IGNORE);
  const signed = {
    appDir: root,
    files: manifest.files,
    createdAt: manifest.createdAt,
    patterns,
    ignore: DEFAULT_IGNORE,
  };

  const outDir = resolve(root, options.out);
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, "manifest.json");
  const signaturePath = join(outDir, "manifest.sig");
  writeFileSync(manifestPath, `${canonicalJson(signed)}\n`);
  writeFileSync(signaturePath, `${signManifest(signed, secret)}\n`);

  const gitignoreUpdated = ensureGitignore();

  console.log(`Manifest: ${Object.keys(signed.files).length} ta fayl`);
  console.log(`Manifest fayl: ${manifestPath}`);
  console.log(`Imzo fayl: ${signaturePath}`);
  if (gitignoreUpdated) console.log(".gitignore: .integrity/ qo'shildi");
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
