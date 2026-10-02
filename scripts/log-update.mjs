import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const content = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?\s*$/);
      if (match) {
        process.env.DATABASE_URL = match[1];
        return;
      }
    }
  } catch {}
}

function arg(name) {
  const prefix = `--${name}=`;
  for (let i = 0; i < process.argv.length; i++) {
    const value = process.argv[i];
    if (value.startsWith(prefix)) return value.slice(prefix.length) || null;
    if (value === `--${name}`) {
      const next = process.argv[i + 1];
      return next && !next.startsWith("--") ? next : null;
    }
  }
  return null;
}

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function normalizePath(path) {
  return path.replace(/\{([^{}]*) => ([^{}]*)\}/, "$2");
}

function collectChanges(since) {
  const range = since && git("rev-parse", "--verify", "--quiet", `${since}^{commit}`)
    ? `${since}..HEAD`
    : "HEAD~1..HEAD";

  const statusMap = new Map();
  const statusOut = git("diff", "--name-status", range);
  for (const line of statusOut.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    const status = parts[0] ?? "";
    const path = parts[parts.length - 1];
    if (path) statusMap.set(normalizePath(path), status.slice(0, 1) || "M");
  }

  const files = [];
  const numstatOut = git("diff", "--numstat", range);
  for (const line of numstatOut.split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const path = normalizePath(parts.slice(2).join("\t"));
    const status = statusMap.get(path) ?? "M";
    statusMap.delete(path);
    files.push({
      path,
      status,
      insertions: Number(parts[0]) || 0,
      deletions: Number(parts[1]) || 0,
    });
  }

  for (const [path, status] of statusMap) {
    files.push({ path, status, insertions: 0, deletions: 0 });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  const insertions = files.reduce((sum, file) => sum + file.insertions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
  return { files, insertions, deletions };
}

async function main() {
  loadEnv();
  const changes = collectChanges(arg("since"));
  const commit = arg("commit") || git("rev-parse", "--short", "HEAD") || null;
  const branch = arg("branch") || git("rev-parse", "--abbrev-ref", "HEAD") || null;
  const title = arg("title") || git("log", "-1", "--format=%s") || "Yangilanish";

  const prisma = new PrismaClient();
  try {
    const row = await prisma.updateLog.create({
      data: {
        title,
        summary: arg("summary"),
        commit,
        branch,
        bugId: arg("bug"),
        node: arg("node"),
        author: arg("author") || git("log", "-1", "--format=%an") || null,
        changes: {
          commit,
          branch,
          files: changes.files,
          insertions: changes.insertions,
          deletions: changes.deletions,
        },
      },
    });
    console.log(`UpdateLog yozildi: ${row.id} — ${title}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`log-update xato: ${error?.message ?? error}`);
  process.exit(1);
});
