import { spawnSync } from "node:child_process";

const log = (msg) => console.log(`[vercel-build] ${msg}`);

function run(label, cmd, args, env) {
  log(label);
  const res = spawnSync(cmd, args, { stdio: "inherit", env });
  if (res.status !== 0) {
    log(`XATO: "${label}" qadam muvaffaqiyatsiz tugadi (exit code: ${res.status ?? "signal " + res.signal}).`);
    process.exit(res.status ?? 1);
  }
}

const unpooled = process.env.DATABASE_URL_UNPOOLED;
const databaseUrl = unpooled || process.env.DATABASE_URL;

if (!databaseUrl) {
  log("XATO: DATABASE_URL_UNPOOLED ham, DATABASE_URL ham topilmadi.");
  log("Vercel loyihasi sozlamalariga (Settings → Environment Variables) DATABASE_URL_UNPOOLED qo'shing.");
  process.exit(1);
}

if (unpooled) {
  log("Migratsiya uchun DATABASE_URL_UNPOOLED (pooler bo'lmagan to'g'ridan-to'g'ri ulanish) ishlatiladi.");
} else {
  log("DATABASE_URL_UNPOOLED topilmadi, DATABASE_URL ishlatiladi.");
}

const env = { ...process.env, DATABASE_URL: databaseUrl };
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

run("prisma generate", npx, ["prisma", "generate"], env);

if (process.env.SKIP_MIGRATE === "1") {
  log("SKIP_MIGRATE=1 — prisma migrate deploy o'tkazildi.");
} else {
  log("prisma migrate deploy — migratsiyalar production DB ga qo'llanadi");
  const migrate = spawnSync(npx, ["prisma", "migrate", "deploy"], { stdio: "inherit", env });
  if (migrate.status !== 0) {
    log("OGOHLANTIRISH: prisma migrate deploy muvaffaqiyatsiz tugadi.");
    log("Build davom etadi (sayt yangilanadi), lekin DB sxemasi eskirgan bo'lib qoladi.");
    log("Sabab ko'pincha: DATABASE_URL pooler (pgbouncer) — bunday holatda DATABASE_URL_UNPOOLED saqlang.");
    log("Qo'lda bajarish: DATABASE_URL=<to'g'ridan-to'g'ri ulanish URL> npx prisma migrate deploy");
    log("Holatni tekshirish: DATABASE_URL=<URL> npx prisma migrate status");
  }
}

run("next build", npx, ["next", "build"], env);

log("Build muvaffaqiyatli yakunlandi.");
