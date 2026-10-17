#!/usr/bin/env node
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";

export const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  ".next",
  ".integrity",
  ".vercel",
  "uploads",
  ".fariza",
  "design-preview",
  "coverage",
  "test-results",
  "playwright-report",
  "tsconfig.tsbuildinfo",
  "next-env.d.ts",
  ".DS_Store",
  "dist",
  "build",
];

export const DEFAULT_PATTERNS = [
  "src",
  "prisma/schema.prisma",
  "prisma/migrations",
  "scripts",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
];

export function toPosix(value) {
  return value.split(sep).join("/");
}

function isIgnored(relPath, ignore) {
  const parts = relPath.split("/");
  for (const name of ignore) {
    if (parts.includes(name)) return true;
    if (relPath === name || relPath.startsWith(`${name}/`)) return true;
  }
  return false;
}

export async function walkFiles(rootDir, ignore = DEFAULT_IGNORE) {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      const rel = toPosix(relative(rootDir, absolute));
      if (isIgnored(rel, ignore)) continue;
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        found.push(rel);
      }
    }
  }
  await walk(rootDir);
  return found.sort();
}

export async function hashFile(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolvePromise());
    stream.on("error", rejectPromise);
  });
  return hash.digest("hex");
}

function normalizeForJson(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (value instanceof Date) return value.toISOString();
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] !== undefined) result[key] = normalizeForJson(value[key]);
  }
  return result;
}

export function canonicalJson(value) {
  const encoded = JSON.stringify(normalizeForJson(value));
  return encoded === undefined ? "null" : encoded;
}

export async function buildManifest(rootDir, patterns = DEFAULT_PATTERNS, ignore = DEFAULT_IGNORE) {
  const files = {};
  for (const pattern of patterns) {
    const absolute = resolve(rootDir, pattern);
    const info = await stat(absolute).catch(() => null);
    if (!info) continue;
    if (info.isFile()) {
      files[toPosix(pattern)] = await hashFile(absolute);
      continue;
    }
    if (!info.isDirectory()) continue;
    const relativeFiles = await walkFiles(absolute, ignore);
    for (const rel of relativeFiles) {
      const key = toPosix(join(pattern, rel));
      if (isIgnored(key, ignore)) continue;
      files[key] = await hashFile(resolve(rootDir, key));
    }
  }
  const sorted = {};
  for (const key of Object.keys(files).sort()) sorted[key] = files[key];
  return { files: sorted, createdAt: new Date().toISOString() };
}

export function diffManifest(expected, actual) {
  const changed = [];
  const missing = [];
  const extra = [];
  for (const key of Object.keys(expected)) {
    if (!(key in actual)) missing.push(key);
    else if (expected[key] !== actual[key]) changed.push(key);
  }
  for (const key of Object.keys(actual)) {
    if (!(key in expected)) extra.push(key);
  }
  return { changed: changed.sort(), missing: missing.sort(), extra: extra.sort() };
}

export function signManifest(manifest, secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("OWNER_INTEGRITY_SECRET bo'sh");
  }
  return createHmac("sha256", secret).update(canonicalJson(manifest)).digest("hex");
}

export function verifyManifestSignature(manifest, signature, secret) {
  if (typeof signature !== "string" || signature.trim().length === 0) return false;
  let expected;
  try {
    expected = signManifest(manifest, secret);
  } catch {
    return false;
  }
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature.trim(), "hex");
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isSafeTempDir(dir) {
  if (typeof dir !== "string" || dir.length === 0) return false;
  try {
    const base = realpathSync(tmpdir());
    const target = realpathSync(dir);
    if (!target.startsWith(`${base}${sep}`)) return false;
    return basename(target).startsWith("fbsu-integrity-");
  } catch {
    return false;
  }
}

export async function selfTest() {
  const lines = [];
  let ok = true;
  const check = (name, passed) => {
    lines.push(`${passed ? "PASS" : "FAIL"} ${name}`);
    if (!passed) ok = false;
  };

  const dir = await mkdtemp(join(tmpdir(), "fbsu-integrity-"));
  const secret = "self-test-secret-1234567890";
  try {
    await writeFile(join(dir, "a.txt"), "alpha\n");
    await writeFile(join(dir, "b.txt"), "beta\n");
    await writeFile(join(dir, "c.txt"), "gamma\n");

    const first = await buildManifest(dir, ["a.txt", "b.txt", "c.txt"]);
    check("manifest 3 fayl", Object.keys(first.files).length === 3);

    const signature = signManifest(first, secret);
    check("imzo HMAC-SHA256 hex", /^[0-9a-f]{64}$/.test(signature));
    check("imzo to'g'ri", verifyManifestSignature(first, signature, secret));
    check("boshqa secret rad etiladi", !verifyManifestSignature(first, signature, `${secret}x`));

    const tampered = { ...first, files: { ...first.files, "a.txt": "0".repeat(64) } };
    check("buzilgan manifest rad etiladi", !verifyManifestSignature(tampered, signature, secret));
    const brokenSig = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;
    check("buzilgan imzo rad etiladi", !verifyManifestSignature(first, brokenSig, secret));

    check("canonicalJson deterministik", canonicalJson({ b: 1, a: { d: 2, c: 3 } }) === canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));

    await writeFile(join(dir, "b.txt"), "beta o'zgardi\n");
    const second = await buildManifest(dir, ["a.txt", "b.txt", "c.txt"]);
    const changedDiff = diffManifest(first.files, second.files);
    check("changed aniqlanadi", changedDiff.changed.length === 1 && changedDiff.changed[0] === "b.txt");
    check("changed boshqa faylga tegmaydi", !changedDiff.changed.includes("a.txt"));

    await rm(join(dir, "c.txt"));
    await writeFile(join(dir, "d.txt"), "delta\n");
    const third = await buildManifest(dir, ["a.txt", "b.txt", "c.txt", "d.txt"]);
    const fullDiff = diffManifest(first.files, third.files);
    check("missing aniqlanadi", fullDiff.missing.includes("c.txt"));
    check("extra aniqlanadi", fullDiff.extra.includes("d.txt"));

    const ignoreDir = join(dir, "node_modules");
    await mkdir(ignoreDir, { recursive: true });
    await writeFile(join(ignoreDir, "skip.txt"), "skip\n");
    const fourth = await buildManifest(dir, ["."]);
    const ignored = Object.keys(fourth.files).some((key) => key.includes("node_modules"));
    check("ignore ishlaydi", !ignored);
  } finally {
    if (isSafeTempDir(dir)) await rm(dir, { recursive: true, force: true });
  }

  return { ok, lines };
}
