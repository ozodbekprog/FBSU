import { randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

type PendingEntry = {
  email: string;
  userId: string;
  expiresAt: string;
};

type PendingStore = Record<string, PendingEntry>;

const CODE_TTL_MS = 10 * 60 * 1000;
const PENDING_FILE = path.join(process.cwd(), "bot", "pending.json");

function parseStore(value: unknown): PendingStore {
  const store: PendingStore = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return store;
  for (const [code, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const raw = entry as Record<string, unknown>;
    if (
      typeof raw.email !== "string" ||
      typeof raw.userId !== "string" ||
      typeof raw.expiresAt !== "string"
    ) {
      continue;
    }
    store[code] = { email: raw.email, userId: raw.userId, expiresAt: raw.expiresAt };
  }
  return store;
}

async function readStore(): Promise<PendingStore> {
  try {
    const raw = await readFile(PENDING_FILE, "utf8");
    return parseStore(JSON.parse(raw));
  } catch {
    return {};
  }
}

function activeStore(store: PendingStore, now: number): PendingStore {
  const active: PendingStore = {};
  for (const [code, entry] of Object.entries(store)) {
    if (new Date(entry.expiresAt).getTime() > now) active[code] = entry;
  }
  return active;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const now = Date.now();
  const store = activeStore(await readStore(), now);

  let code = "";
  do {
    code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  } while (store[code]);

  const expiresAt = new Date(now + CODE_TTL_MS).toISOString();
  store[code] = { email: user.email, userId: user.id, expiresAt };

  try {
    await mkdir(path.dirname(PENDING_FILE), { recursive: true });
    await writeFile(PENDING_FILE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  } catch {
    return Response.json({ ok: false, error: "Kodni saqlab bo'lmadi" }, { status: 500 });
  }

  return Response.json({ ok: true, data: { code, expiresAt } });
}
