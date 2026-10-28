import path from "node:path";
import { fileURLToPath } from "node:url";

const BOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(BOT_DIR, "..");

for (const file of [".env", ".env.local"]) {
  try {
    if (typeof process.loadEnvFile === "function") process.loadEnvFile(path.join(ROOT_DIR, file));
  } catch {}
}

const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
const appUrl = (process.env.FBSU_APP_URL ?? "https://fbsu.vercel.app").trim().replace(/\/+$/, "");
const checkOnly = process.argv.includes("--check");

if (!token) {
  console.error("Xato: TELEGRAM_BOT_TOKEN topilmadi (.env yoki .env.local).");
  process.exit(1);
}

if (!appUrl.startsWith("https://")) {
  console.error("Xato: mini ilova manzili https:// bilan boshlanishi shart.");
  process.exit(1);
}

async function callApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const body = await response.json();
  if (!body.ok) throw new Error(`${method}: ${body.description ?? response.status}`);
  return body.result;
}

const COMMANDS = [
  { command: "app", description: "FBSU mini ilovasini ochish" },
  { command: "jadval", description: "Bugungi darslar" },
  { command: "ertaga", description: "Ertangi darslar" },
  { command: "hafta", description: "Haftalik jadval" },
  { command: "davomat", description: "Bugungi davomat" },
  { command: "imtihon", description: "Kelayotgan imtihonlar" },
  { command: "help", description: "Yordam" },
];

async function main() {
  const me = await callApi("getMe", {});
  console.log(`Bot: @${me.username} (${me.first_name})`);

  if (checkOnly) {
    const menu = await callApi("getChatMenuButton", {});
    const commands = await callApi("getMyCommands", {});
    console.log("Menyu tugmasi:", JSON.stringify(menu));
    console.log("Buyruqlar:", commands.map((item) => `/${item.command}`).join(" "));
    return;
  }

  await callApi("setChatMenuButton", {
    menu_button: { type: "web_app", text: "FBSU", web_app: { url: appUrl } },
  });
  await callApi("setMyCommands", { commands: COMMANDS });
  await callApi("setMyName", { name: "FBSU LMS" });
  await callApi("setMyDescription", {
    description:
      "FBSU LMS — jadval, baholar, davomat va imtihonlar Telegram ichida. Pastdagi FBSU tugmasi orqali mini ilovani oching.",
  });
  await callApi("setMyShortDescription", {
    short_description: "FBSU jadval, baholar va davomat — Telegram ichida.",
  });

  console.log(`Menyu tugmasi: FBSU → ${appUrl}`);
  console.log(`Buyruqlar: ${COMMANDS.map((item) => `/${item.command}`).join(" ")}`);
  console.log("Nom: FBSU LMS");
}

main().catch((error) => {
  console.error("Sozlashda xato:", error instanceof Error ? error.message : error);
  process.exit(1);
});
