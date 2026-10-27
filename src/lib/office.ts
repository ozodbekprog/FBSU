export type OfficeType = "word" | "sheets" | "slides";

export type OfficeMeta = {
  fbsuOffice: true;
  officeType: OfficeType;
};

export const OFFICE_TYPES: OfficeType[] = ["word", "sheets", "slides"];

export function isOfficeType(value: unknown): value is OfficeType {
  return value === "word" || value === "sheets" || value === "slides";
}

export function isOfficeMeta(value: unknown): value is OfficeMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.fbsuOffice === true && isOfficeType(record.officeType);
}

export type WordBody = {
  version: 1;
  html: string;
};

export type SheetAlign = "left" | "center" | "right";

export type SheetCell = {
  v: string;
  bold?: boolean;
  italic?: boolean;
  align?: SheetAlign;
};

export type SheetsBody = {
  version: 1;
  rows: number;
  cols: number;
  cells: Record<string, SheetCell>;
};

export type SlideTheme = "light" | "navy" | "forest" | "cream";
export type SlideLayout = "cover" | "content";

export type SlideItem = {
  id: string;
  title: string;
  body: string;
  theme: SlideTheme;
  layout: SlideLayout;
};

export type SlidesBody = {
  version: 1;
  slides: SlideItem[];
};

export type OfficeBody = WordBody | SheetsBody | SlidesBody;

export type OfficeSummary = {
  id: string;
  title: string;
  type: OfficeType;
  updatedAt: string;
  author: string;
};

export const SHEET_MIN_ROWS = 8;
export const SHEET_MAX_ROWS = 200;
export const SHEET_MAX_COLS = 26;

export const SLIDE_THEMES: Record<SlideTheme, { bg: string; fg: string; muted: string; accent: string }> = {
  light: { bg: "#ffffff", fg: "#101828", muted: "#667085", accent: "#c9a227" },
  navy: { bg: "#131f3c", fg: "#f8fafc", muted: "#b9c6e4", accent: "#e3c76a" },
  forest: { bg: "#0f2e24", fg: "#f0fdf7", muted: "#a7d8c4", accent: "#34d399" },
  cream: { bg: "#f7f2e6", fg: "#2b2416", muted: "#7a6a4f", accent: "#a9871f" },
};

export function newSlide(theme: SlideTheme = "light", layout: SlideLayout = "content"): SlideItem {
  return {
    id: globalThis.crypto.randomUUID(),
    title: "",
    body: "",
    theme,
    layout,
  };
}

export function createOfficeBody(type: OfficeType): OfficeBody {
  if (type === "word") return { version: 1, html: "" };
  if (type === "sheets") return { version: 1, rows: 24, cols: 10, cells: {} };
  return { version: 1, slides: [newSlide("light", "cover")] };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeCell(value: unknown): SheetCell | null {
  const record = asRecord(value);
  if (!record || typeof record.v !== "string") return null;
  const cell: SheetCell = { v: record.v.slice(0, 4000) };
  if (record.bold === true) cell.bold = true;
  if (record.italic === true) cell.italic = true;
  if (record.align === "left" || record.align === "center" || record.align === "right") {
    cell.align = record.align;
  }
  return cell;
}

function normalizeTheme(value: unknown): SlideTheme {
  return value === "navy" || value === "forest" || value === "cream" ? value : "light";
}

function normalizeSlide(value: unknown): SlideItem | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : globalThis.crypto.randomUUID(),
    title: typeof record.title === "string" ? record.title.slice(0, 300) : "",
    body: typeof record.body === "string" ? record.body.slice(0, 4000) : "",
    theme: normalizeTheme(record.theme),
    layout: record.layout === "cover" ? "cover" : "content",
  };
}

export function normalizeOfficeBody(type: OfficeType, value: unknown): OfficeBody | null {
  const record = asRecord(value);
  if (!record) return null;

  if (type === "word") {
    if (typeof record.html !== "string") return null;
    return { version: 1, html: record.html.slice(0, 500_000) };
  }

  if (type === "sheets") {
    const rows = typeof record.rows === "number" && Number.isFinite(record.rows) ? record.rows : null;
    const cols = typeof record.cols === "number" && Number.isFinite(record.cols) ? record.cols : null;
    const cellRecord = asRecord(record.cells);
    if (rows === null || cols === null || !cellRecord) return null;
    const cells: Record<string, SheetCell> = {};
    for (const [key, raw] of Object.entries(cellRecord)) {
      if (!/^[A-Z]{1,2}[1-9]\d{0,2}$/.test(key)) continue;
      const cell = normalizeCell(raw);
      if (cell) cells[key] = cell;
    }
    return {
      version: 1,
      rows: clampInt(rows, SHEET_MIN_ROWS, SHEET_MAX_ROWS),
      cols: clampInt(cols, 1, SHEET_MAX_COLS),
      cells,
    };
  }

  if (!Array.isArray(record.slides)) return null;
  const slides = record.slides.map(normalizeSlide).filter((slide): slide is SlideItem => slide !== null);
  if (slides.length === 0) return null;
  return { version: 1, slides: slides.slice(0, 80) };
}

export function parseOfficeBody(type: OfficeType, raw: string): OfficeBody {
  try {
    const parsed = normalizeOfficeBody(type, JSON.parse(raw));
    return parsed ?? createOfficeBody(type);
  } catch {
    return createOfficeBody(type);
  }
}

export function sheetKey(colIndex: number, rowIndex: number): string {
  let label = "";
  let index = colIndex;
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label;
    index = Math.floor(index / 26) - 1;
  }
  return `${label}${rowIndex + 1}`;
}
