import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { verifyCsrfFromRequest } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMPORT_TYPES = ["students", "groups", "subjects"] as const;
const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const ROLES = [
  "ADMIN",
  "REKTOR",
  "PRO_RECTOR",
  "DEKAN",
  "KAFEDRA_MUDIRI",
  "REGISTRAR",
  "BUXGALTER",
  "TYUTOR",
  "TEACHER",
  "STUDENT",
  "XODIM",
  "OTA_ONA",
] as const satisfies readonly Role[];

/**
 * Registrator faqat ushbu rollardagi foydalanuvchilarni import qila oladi.
 * Boshqa rollarni (ADMIN, REKTOR, ...) import qilish — ADMIN huquqi.
 */
const REGISTRAR_IMPORT_ROLES: readonly Role[] = ["STUDENT", "TEACHER"];

type ImportType = (typeof IMPORT_TYPES)[number];

type RowError = { row: number; message: string };

type ImportItem = {
  row: number;
  status: "created" | "skipped";
  label: string;
  detail: string;
  email?: string;
  password?: string;
};

type ImportSummary = {
  created: number;
  skipped: number;
  errors: RowError[];
  items: ImportItem[];
};

const HEADER_ALIASES: Record<ImportType, Record<string, string>> = {
  students: {
    ism: "name",
    name: "name",
    email: "email",
    guruh: "group",
    group: "group",
    subgroup: "subGroup",
    telefon: "phone",
    phone: "phone",
    rol: "role",
    role: "role",
  },
  groups: {
    nomi: "name",
    name: "name",
    yil: "year",
    year: "year",
    fakultet: "faculty",
    faculty: "faculty",
    rol: "role",
    role: "role",
  },
  subjects: {
    nomi: "name",
    name: "name",
    kod: "code",
    code: "code",
    rang: "color",
    color: "color",
    rol: "role",
    role: "role",
  },
};

const HEADER_SIGNATURES: Record<ImportType, string[]> = {
  students: ["name", "email", "group"],
  groups: ["name"],
  subjects: ["name"],
};

const DEFAULT_COLUMNS: Record<ImportType, Record<string, number>> = {
  students: { name: 0, email: 1, group: 2, subGroup: 3, phone: 4 },
  groups: { name: 0, year: 1, faculty: 2 },
  subjects: { name: 0, code: 1, color: 2 },
};

const studentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  group: z.string().trim().min(1).max(60),
  subGroup: z.string().trim().max(60).optional(),
});

const groupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  year: z.number().int().min(2000).max(2100).nullable(),
});

const subjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(20).nullable(),
  color: z.string().trim().regex(COLOR_PATTERN).nullable(),
});

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function resolveColumns(rows: string[][], type: ImportType) {
  const first = rows[0] ?? [];
  const aliases = HEADER_ALIASES[type];
  const map: Record<string, number> = {};

  first.forEach((cell, index) => {
    const key = aliases[normalizeHeader(cell)];
    if (key !== undefined && map[key] === undefined) map[key] = index;
  });

  const hasHeader = HEADER_SIGNATURES[type].some((key) => map[key] !== undefined);
  if (hasHeader) return { map, start: 1 };
  return { map: DEFAULT_COLUMNS[type], start: 0 };
}

function cellValue(cells: string[], map: Record<string, number>, key: string) {
  const index = map[key];
  if (index === undefined) return "";
  return (cells[index] ?? "").trim();
}

function normalizeRole(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[\s_-]+/g, "");
  return (ROLES as readonly string[]).includes(normalized) ? normalized : null;
}

/**
 * REGISTRAR uchun xavfsizlik teksrovi: ruxsat etilmagan rolni ko'rsatgan
 * qator aniq xato bilan rad etiladi. ADMIN hamma rolni import qila oladi.
 */
function registrarImportError(
  userRole: Role,
  row: number,
  value: string,
): RowError | null {
  if (userRole !== "REGISTRAR") return null;
  const role = normalizeRole(value);
  if (!role || REGISTRAR_IMPORT_ROLES.includes(role as Role)) return null;
  return {
    row,
    message: `Ruxsat etilmagan rol: ${value || "bo'sh"} (faqat ${REGISTRAR_IMPORT_ROLES.join("/")})`,
  };
}

function isBlankRow(cells: string[]) {
  return cells.every((cell) => cell.trim() === "");
}

function emptySummary(): ImportSummary {
  return { created: 0, skipped: 0, errors: [], items: [] };
}

function generatePassword(length = 8) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }
  return value;
}

async function findOrCreateGroup(name: string, cache: Map<string, string>) {
  const cached = cache.get(name);
  if (cached) return cached;
  const existing = await prisma.group.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }
  const created = await prisma.group.create({ data: { name }, select: { id: true } });
  cache.set(name, created.id);
  return created.id;
}

async function findOrCreateFaculty(name: string, cache: Map<string, string>) {
  const cached = cache.get(name);
  if (cached) return cached;
  const existing = await prisma.faculty.findUnique({ where: { name }, select: { id: true } });
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }
  const created = await prisma.faculty.create({ data: { name }, select: { id: true } });
  cache.set(name, created.id);
  return created.id;
}

async function importStudents(rows: string[][], userRole: Role): Promise<ImportSummary> {
  const summary = emptySummary();
  const { map, start } = resolveColumns(rows, "students");
  const groupCache = new Map<string, string>();
  const seenEmails = new Set<string>();

  for (let index = start; index < rows.length; index += 1) {
    const cells = rows[index];
    const rowNumber = index + 1;
    if (isBlankRow(cells)) continue;

    const roleError = registrarImportError(userRole, rowNumber, cellValue(cells, map, "role"));
    if (roleError) {
      summary.errors.push(roleError);
      continue;
    }

    const name = cellValue(cells, map, "name");
    const email = cellValue(cells, map, "email").toLowerCase();
    const groupName = cellValue(cells, map, "group");
    const subGroupName = cellValue(cells, map, "subGroup");

    if (!name || !email || !groupName) {
      summary.errors.push({ row: rowNumber, message: "ism, email va guruh ustunlari to'ldirilishi shart" });
      continue;
    }

    const parsed = studentSchema.safeParse({
      name,
      email,
      group: groupName,
      subGroup: subGroupName || undefined,
    });
    if (!parsed.success) {
      summary.errors.push({ row: rowNumber, message: "Ma'lumotlar noto'g'ri (ism, email yoki guruh)" });
      continue;
    }

    if (seenEmails.has(parsed.data.email)) {
      summary.skipped += 1;
      summary.items.push({
        row: rowNumber,
        status: "skipped",
        label: parsed.data.name,
        detail: "Faylda takrorlangan email",
      });
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) {
      seenEmails.add(parsed.data.email);
      summary.skipped += 1;
      summary.items.push({
        row: rowNumber,
        status: "skipped",
        label: parsed.data.name,
        detail: "Bu email bazada mavjud",
        email: parsed.data.email,
      });
      continue;
    }

    try {
      const groupId = await findOrCreateGroup(parsed.data.group, groupCache);
      let subGroupId: string | null = null;
      if (parsed.data.subGroup) {
        const subGroup = await prisma.subGroup.findUnique({
          where: { groupId_name: { groupId, name: parsed.data.subGroup } },
          select: { id: true },
        });
        subGroupId = subGroup?.id ?? null;
      }

      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: "STUDENT",
          groupId,
          subGroupId,
        },
      });

      seenEmails.add(parsed.data.email);
      summary.created += 1;
      summary.items.push({
        row: rowNumber,
        status: "created",
        label: parsed.data.name,
        email: parsed.data.email,
        detail: `${parsed.data.email} · ${parsed.data.group}${subGroupId && parsed.data.subGroup ? ` / ${parsed.data.subGroup}` : ""}`,
        password,
      });
    } catch {
      summary.errors.push({ row: rowNumber, message: "Talabani yaratib bo'lmadi" });
    }
  }

  return summary;
}

async function importGroups(rows: string[][], userRole: Role): Promise<ImportSummary> {
  const summary = emptySummary();
  const { map, start } = resolveColumns(rows, "groups");
  const facultyCache = new Map<string, string>();
  const seen = new Set<string>();

  for (let index = start; index < rows.length; index += 1) {
    const cells = rows[index];
    const rowNumber = index + 1;
    if (isBlankRow(cells)) continue;

    const roleError = registrarImportError(userRole, rowNumber, cellValue(cells, map, "role"));
    if (roleError) {
      summary.errors.push(roleError);
      continue;
    }

    const name = cellValue(cells, map, "name");
    const yearText = cellValue(cells, map, "year");
    const facultyName = cellValue(cells, map, "faculty");

    if (!name) {
      summary.errors.push({ row: rowNumber, message: "nomi ustuni to'ldirilishi shart" });
      continue;
    }

    let year: number | null = null;
    if (yearText) {
      const value = Number(yearText);
      if (!Number.isInteger(value) || value < 2000 || value > 2100) {
        summary.errors.push({ row: rowNumber, message: "Yil 2000 va 2100 orasida butun son bo'lishi kerak" });
        continue;
      }
      year = value;
    }

    const parsed = groupSchema.safeParse({ name, year });
    if (!parsed.success) {
      summary.errors.push({ row: rowNumber, message: "Guruh nomi noto'g'ri (2–60 belgi)" });
      continue;
    }

    if (seen.has(parsed.data.name)) {
      summary.skipped += 1;
      summary.items.push({ row: rowNumber, status: "skipped", label: parsed.data.name, detail: "Faylda takrorlangan guruh" });
      continue;
    }
    seen.add(parsed.data.name);

    const existing = await prisma.group.findUnique({ where: { name: parsed.data.name }, select: { id: true } });
    if (existing) {
      summary.skipped += 1;
      summary.items.push({ row: rowNumber, status: "skipped", label: parsed.data.name, detail: "Bu nomdagi guruh mavjud" });
      continue;
    }

    try {
      const facultyId = facultyName ? await findOrCreateFaculty(facultyName, facultyCache) : null;
      await prisma.group.create({
        data: { name: parsed.data.name, year: parsed.data.year, facultyId },
      });
      summary.created += 1;
      summary.items.push({
        row: rowNumber,
        status: "created",
        label: parsed.data.name,
        detail: [parsed.data.year ? String(parsed.data.year) : null, facultyName || null].filter(Boolean).join(" · ") || "Yangi guruh",
      });
    } catch {
      summary.errors.push({ row: rowNumber, message: "Guruhni yaratib bo'lmadi" });
    }
  }

  return summary;
}

async function importSubjects(rows: string[][], userRole: Role): Promise<ImportSummary> {
  const summary = emptySummary();
  const { map, start } = resolveColumns(rows, "subjects");
  const seen = new Set<string>();

  for (let index = start; index < rows.length; index += 1) {
    const cells = rows[index];
    const rowNumber = index + 1;
    if (isBlankRow(cells)) continue;

    const roleError = registrarImportError(userRole, rowNumber, cellValue(cells, map, "role"));
    if (roleError) {
      summary.errors.push(roleError);
      continue;
    }

    const name = cellValue(cells, map, "name");
    const codeText = cellValue(cells, map, "code");
    const colorText = cellValue(cells, map, "color");

    if (!name) {
      summary.errors.push({ row: rowNumber, message: "nomi ustuni to'ldirilishi shart" });
      continue;
    }
    if (colorText && !COLOR_PATTERN.test(colorText)) {
      summary.errors.push({ row: rowNumber, message: "Rang #RRGGBB formatida bo'lishi kerak" });
      continue;
    }

    const parsed = subjectSchema.safeParse({
      name,
      code: codeText || null,
      color: colorText || null,
    });
    if (!parsed.success) {
      summary.errors.push({ row: rowNumber, message: "Fan nomi noto'g'ri (2–120 belgi)" });
      continue;
    }

    if (seen.has(parsed.data.name)) {
      summary.skipped += 1;
      summary.items.push({ row: rowNumber, status: "skipped", label: parsed.data.name, detail: "Faylda takrorlangan fan" });
      continue;
    }
    seen.add(parsed.data.name);

    const existing = await prisma.subject.findUnique({ where: { name: parsed.data.name }, select: { id: true } });
    if (existing) {
      summary.skipped += 1;
      summary.items.push({ row: rowNumber, status: "skipped", label: parsed.data.name, detail: "Bu nomdagi fan mavjud" });
      continue;
    }

    try {
      await prisma.subject.create({
        data: {
          name: parsed.data.name,
          code: parsed.data.code,
          color: parsed.data.color ?? "#3f5a9d",
        },
      });
      summary.created += 1;
      summary.items.push({
        row: rowNumber,
        status: "created",
        label: parsed.data.name,
        detail: [parsed.data.code, parsed.data.color].filter(Boolean).join(" · ") || "Yangi fan",
      });
    } catch {
      summary.errors.push({ row: rowNumber, message: "Fanni yaratib bo'lmadi" });
    }
  }

  return summary;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "REGISTRAR") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const csrfValid = await verifyCsrfFromRequest(request);
  if (!csrfValid) {
    return Response.json({ ok: false, error: "CSRF token yaroqsiz" }, { status: 403 });
  }

  const contentLength = request.headers.get("content-length");
  const declaredSize = contentLength === null ? Number.NaN : Number(contentLength);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_FILE_SIZE + 1024 * 1024) {
    return Response.json({ ok: false, error: "Fayl juda katta (maks 5MB)" }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return Response.json({ ok: false, error: "FormData yuborilmadi" }, { status: 400 });

  const typeParsed = z.enum(IMPORT_TYPES).safeParse(formData.get("type"));
  if (!typeParsed.success) {
    return Response.json({ ok: false, error: "Import turi noto'g'ri" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ ok: false, error: "CSV fayl tanlanmagan" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ ok: false, error: "Fayl juda katta (maks 5MB)" }, { status: 413 });
  }

  const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const rows = parseCsv(text);

  const summary =
    typeParsed.data === "students"
      ? await importStudents(rows, user.role)
      : typeParsed.data === "groups"
        ? await importGroups(rows, user.role)
        : await importSubjects(rows, user.role);

  return Response.json({ ok: true, data: summary }, { headers: { "Cache-Control": "no-store" } });
}
