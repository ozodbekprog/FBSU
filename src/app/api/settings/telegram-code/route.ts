import { randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";

export const runtime = "nodejs";

const PENDING_FILE = path.join(process.cwd(), "bot", "pending.json");
const CODE_TTL_MS = 10 * 60 * 1000;

type PendingEntry = {
  email: string;
  userId: string;
  expiresAt: string;
};

type PendingMap = Record<string, PendingEntry>;

function isValidEntry(value: unknown): value is PendingEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.email === "string" &&
    typeof entry.userId === "string" &&
    typeof entry.expiresAt === "string"
  );
}

async function readPending(): Promise<PendingMap> {
  try {
    const raw = await readFile(PENDING_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    const now = Date.now();
    const pending: PendingMap = {};
    for (const [code, value] of Object.entries(parsed)) {
      if (!isValidEntry(value)) continue;
      const expiresAt = Date.parse(value.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) continue;
      pending[code] = value;
    }
    return pending;
  } catch {
    return {};
  }
}

async function writePending(pending: PendingMap): Promise<void> {
  await mkdir(path.dirname(PENDING_FILE), { recursive: true });
  await writeFile(PENDING_FILE, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
}

function nextCode(pending: PendingMap): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomInt(0, 1000000).toString().padStart(6, "0");
    if (!(code in pending)) return code;
  }
  throw new Error("Kod generatsiya qilinmadi");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  try {
    const pending = await readPending();
    for (const [code, entry] of Object.entries(pending)) {
      if (entry.userId === user.id) delete pending[code];
    }

    const code = nextCode(pending);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
    pending[code] = { email: user.email, userId: user.id, expiresAt };
    await writePending(pending);

    return Response.json({ ok: true, data: { code, expiresAt } });
  } catch {
    return Response.json({ ok: false, error: "Kodni saqlab bo'lmadi" }, { status: 500 });
  }
}
