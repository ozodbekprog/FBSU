// Login sahifasidagi demo tugmalari faqat prisma/seed.mjs yaratadigan
// hisoblarga ulanishi kerak. Aks holda tugma bosilganda "Email yoki parol xato"
// chiqadi. Bu test moslikni CI'da kafolatlaydi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const loginPage = readFileSync(
  fileURLToPath(new URL("../src/app/(auth)/login/page.tsx", import.meta.url)),
  "utf8",
);
const seed = readFileSync(
  fileURLToPath(new URL("../prisma/seed.mjs", import.meta.url)),
  "utf8",
);

// DEMO_ACCOUNTS massividagi email'lar.
const demoAccountsBlock = loginPage.slice(
  loginPage.indexOf("const DEMO_ACCOUNTS"),
  loginPage.indexOf("const PANEL_FEATURES"),
);
const demoEmails = [...demoAccountsBlock.matchAll(/email:\s*"([^"]+)"/g)].map(
  (m) => m[1],
);

// seed.mjs dagi `users` massividan email/role juftligi.
const usersBlock = seed.slice(seed.indexOf("const users = ["), seed.indexOf("const created = {}"));
const seededUsers = [...usersBlock.matchAll(/email:\s*"([^"]+)",\s*name:\s*"[^"]*",\s*role:\s*"([A-Z_]+)"/g)].map(
  (m) => ({ email: m[1], role: m[2] }),
);
const seededRoles = new Map(seededUsers.map((u) => [u.email, u.role]));

describe("login sahifasi demo hisoblari", () => {
  it("demo roliklar topiladi", () => {
    expect(demoEmails.length).toBeGreaterThan(0);
    expect(seededUsers.length).toBeGreaterThan(0);
  });

  it("har bir demo email seed'da mavjud", () => {
    const missing = demoEmails.filter((e) => !seededRoles.has(e));
    expect(missing, `seed.mjs da yo'q demo hisoblar: ${missing.join(", ")}`).toEqual([]);
  });

  it("demo email'lar takrorlanmaydi", () => {
    const dupes = demoEmails.filter((e, i) => demoEmails.indexOf(e) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it("seed paroli login sahifasidagi parol bilan mos", () => {
    const seedPassword = seed.match(/PASSWORD\s*=\s*process\.env\.SEED_PASSWORD\s*\|\|\s*"([^"]+)"/)?.[1];
    const loginPassword = loginPage.match(/setPassword\("([^"]+)"\)/)?.[1];
    expect(seedPassword).toBeTruthy();
    expect(loginPassword).toBe(seedPassword);
  });

  it("o'qituvchi demo tugmasi haqiqiy o'qituvchiga ulangan", () => {
    const teacherDemos = demoEmails.filter((e) => seededRoles.get(e) === "TEACHER");
    expect(teacherDemos.length, "login sahifasida o'qituvchi demo hisobi yo'q").toBeGreaterThan(0);
  });

  it("turli xil rollar takrorlanmaydi", () => {
    const demoRoles = demoEmails.map((e) => seededRoles.get(e));
    expect(demoRoles.every(Boolean)).toBe(true);
    expect(new Set(demoRoles).size).toBe(demoRoles.length);
  });
});