// Nav yo'nalishlarini ikonkalar bilan solishtiradi.
// Ishlatish: node scripts/check-nav-icons.mjs
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/(app)/layout.tsx", "utf8");
const icons3d = readFileSync("src/components/nav/nav-3d-icons.tsx", "utf8");
const drawer = readFileSync("src/components/nav/nav-drawer-icons.tsx", "utf8");

const hrefs = [...layout.matchAll(/href:\s*"(\/[^"]+)"/g)].map((m) => m[1]);
const uniq = [...new Set(hrefs)].sort();

const missing3d = uniq.filter((h) => !icons3d.includes(`"${h}":`));
const missingDrawer = uniq.filter((h) => !drawer.includes(`"${h}":`));

console.log(`Jami nav yo'nalishlar: ${uniq.length}`);
console.log(`\n3D ikonka YO'Q (${missing3d.length}):`);
missing3d.forEach((h) => console.log(`  ${h}`));
console.log(`\nDrawer ikonka YO'Q (${missingDrawer.length}):`);
missingDrawer.forEach((h) => console.log(`  ${h}`));
