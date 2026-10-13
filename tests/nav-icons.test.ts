// Nav paneldagi har bir yo'nalishda ikonka borligini kafolatlaydi.
// Yangi yo'nalish qo'shilib, ikonkasi esdan chiqsa — test yiqiladi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const layout = read("../src/app/(app)/layout.tsx");
const icons3d = read("../src/components/nav/nav-3d-icons.tsx");
const drawer = read("../src/components/nav/nav-drawer-icons.tsx");

// layout.tsx dagi barcha `href: "/..."` yo'nalishlari.
const navHrefs = [...new Set([...layout.matchAll(/href:\s*"(\/[^"]+)"/g)].map((m) => m[1]))].sort();

// Ikonka xaritalaridagi kalitlar: "/dashboard": Gauge  yoki  "/dashboard": (.
const keysIn = (source: string) =>
  new Set([...source.matchAll(/"(\/[a-z0-9\-\/]+)":/g)].map((m) => m[1]));

const keys3d = keysIn(icons3d);
const keysDrawer = keysIn(drawer);

// Ichki sahifalar uchun eng uzun mos kalit ishlatiladi: /exams/1 -> /exams
const covered = (href: string, keys: Set<string>) => {
  if (keys.has(href)) return true;
  return [...keys].some((k) => href.startsWith(`${k}/`));
};

// Bu branch'dagi eski kamchiliklar (mening vazifam doirasidan tashqari).
// Maqsad: yangi kamchilik qo'shilmasin, eskilari ko'rinib tursin.
// Har biri tuzatilganda shu ro'yxatdan o'chirilsin.
const KNOWN_GAPS_3D = new Set(["/assistant", "/research"]);
const KNOWN_GAPS_DRAWER = new Set(["/admissions", "/assistant", "/research", "/turniket"]);

describe("nav ikonkalari", () => {
  it("yo'nalishlar topildi", () => {
    expect(navHrefs.length).toBeGreaterThan(20);
  });

  it("3D ikonka: yangi kamchilik yo'q", () => {
    const missing = navHrefs.filter((h) => !covered(h, keys3d) && !KNOWN_GAPS_3D.has(h));
    expect(missing, `3D ikonka yo'q: ${missing.join(", ")}`).toEqual([]);
  });

  it("drawer ikonka: yangi kamchilik yo'q", () => {
    const missing = navHrefs.filter((h) => !covered(h, keysDrawer) && !KNOWN_GAPS_DRAWER.has(h));
    expect(missing, `drawer ikonka yo'q: ${missing.join(", ")}`).toEqual([]);
  });

  it("eski kamchiliklar ro'yxati eskirib qolmagan", () => {
    // Tuzatilgan ikonka ro'yxatda qolib ketsa — tozalanadi.
    const stale3d = [...KNOWN_GAPS_3D].filter((h) => !navHrefs.includes(h) || covered(h, keys3d));
    const staleDrawer = [...KNOWN_GAPS_DRAWER].filter((h) => !navHrefs.includes(h) || covered(h, keysDrawer));
    expect(stale3d, `3D ro'yxatdan o'chiring: ${stale3d.join(", ")}`).toEqual([]);
    expect(staleDrawer, `drawer ro'yxatdan o'chiring: ${staleDrawer.join(", ")}`).toEqual([]);
  });

  it("xavfsiz imtihon ikonkasi ikkala xaritada ham bor", () => {
    expect(keys3d.has("/secure-exams"), "3D xaritada /secure-exams yo'q").toBe(true);
    expect(keysDrawer.has("/secure-exams"), "drawer xaritada /secure-exams yo'q").toBe(true);
  });
});
