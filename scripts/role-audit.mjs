#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src", import.meta.url).pathname;
const PATTERNS = [
  { name: "role === / role !==", re: /\.role\s*[!=]==\s*"/g },
  { name: "role array includes", re: /includes\(\s*[\w.]*\.role\s*\)/g },
  { name: "role dan includes parametri", re: /\.includes\(\s*user\.role\s*\)/g },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const results = [];
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  const counts = PATTERNS.map((p) => ({ name: p.name, count: (text.match(p.re) ?? []).length }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total > 0) {
    results.push({ file: relative(process.cwd(), file), total, counts });
  }
}

results.sort((a, b) => b.total - a.total);
const grand = results.reduce((sum, r) => sum + r.total, 0);

console.log(`Xom rol tekshiruvlari: ${grand} ta, ${results.length} fayl\n`);
for (const r of results.slice(0, 40)) {
  const detail = r.counts.filter((c) => c.count > 0).map((c) => `${c.name}:${c.count}`).join(", ");
  console.log(`${String(r.total).padStart(3)}  ${r.file}  (${detail})`);
}
if (results.length > 40) {
  console.log(`... yana ${results.length - 40} fayl`);
}
