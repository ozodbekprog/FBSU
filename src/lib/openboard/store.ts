import {
  codeLanguages,
  createId,
  emptyOpenboard,
  nowIso,
  openboardDataSchema,
  type OpenboardBlock,
  type OpenboardData,
  type OpenboardNote,
} from "./types";

const LAB_ITEMS = 3;
const LAB_ROWS = 3;
const LAB_COLS = 3;
const DRAWING_BACKGROUND = "#ffffff";
const SKETCH_ICON = "✏️";
const SNIPPET_LENGTH = 90;

function makeNote(title: string, icon: string, blocks: OpenboardBlock[]): OpenboardNote {
  const timestamp = nowIso();
  return { id: createId(), title, icon, blocks, createdAt: timestamp, updatedAt: timestamp };
}

function isLegacyExcalidraw(raw: unknown): raw is { elements: unknown[] } {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }
  const candidate = raw as Record<string, unknown>;
  return (
    candidate.v === 2 &&
    candidate.kind === "excalidraw" &&
    Array.isArray(candidate.elements)
  );
}

export function migrateLegacy(
  raw: unknown,
  legacyTitle: string,
): { data: OpenboardData; needsSave: boolean } {
  if (raw === null || raw === undefined) {
    return { data: emptyOpenboard(), needsSave: false };
  }
  if (isLegacyExcalidraw(raw)) {
    const note = makeNote(legacyTitle, SKETCH_ICON, [
      {
        id: createId(),
        type: "drawing",
        scene: raw.elements,
        sceneAppState: { viewBackgroundColor: DRAWING_BACKGROUND },
      },
    ]);
    return { data: { v: 3, kind: "openboard", notes: [note] }, needsSave: true };
  }
  const parsed = openboardDataSchema.safeParse(raw);
  if (parsed.success) {
    return { data: parsed.data, needsSave: false };
  }
  return { data: emptyOpenboard(), needsSave: false };
}

export function createEmptyNote(title: string): OpenboardNote {
  return makeNote(title, "", [{ id: createId(), type: "text", html: "" }]);
}

export function createSketchNote(title: string): OpenboardNote {
  return makeNote(title, SKETCH_ICON, [
    {
      id: createId(),
      type: "drawing",
      scene: [],
      sceneAppState: { viewBackgroundColor: DRAWING_BACKGROUND },
    },
  ]);
}

export function createLabNote(
  title: string,
  labels: {
    goal: string;
    equipment: string;
    steps: string;
    measurements: string;
    calculation: string;
    conclusion: string;
    simLink: string;
  },
): OpenboardNote {
  return makeNote(title, "🧪", [
    { id: createId(), type: "heading", html: labels.goal, level: 2 },
    { id: createId(), type: "text", html: "" },
    { id: createId(), type: "heading", html: labels.equipment, level: 2 },
    { id: createId(), type: "text", html: "" },
    { id: createId(), type: "heading", html: labels.steps, level: 2 },
    {
      id: createId(),
      type: "checklist",
      items: Array.from({ length: LAB_ITEMS }, () => ({
        id: createId(),
        text: "",
        done: false,
      })),
    },
    { id: createId(), type: "heading", html: labels.measurements, level: 2 },
    {
      id: createId(),
      type: "table",
      header: true,
      rows: Array.from({ length: LAB_ROWS }, () =>
        Array.from({ length: LAB_COLS }, () => ""),
      ),
    },
    { id: createId(), type: "heading", html: labels.calculation, level: 2 },
    { id: createId(), type: "formula", tex: "" },
    { id: createId(), type: "heading", html: labels.conclusion, level: 2 },
    { id: createId(), type: "text", html: "" },
    { id: createId(), type: "text", html: `<a href="/labs">${labels.simLink}</a>` },
  ]);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function noteSnippet(note: OpenboardNote): string {
  const parts: string[] = [];
  for (const block of note.blocks) {
    if (block.type === "text" || block.type === "heading") {
      parts.push(stripHtml(block.html));
    }
  }
  return parts.join(" ").slice(0, SNIPPET_LENGTH);
}

export function searchNotes(notes: OpenboardNote[], query: string): OpenboardNote[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return notes;
  }
  return notes.filter((note) => `${note.title} ${noteSnippet(note)}`.toLowerCase().includes(q));
}

export function touchNote(note: OpenboardNote, at?: string): OpenboardNote {
  return { ...note, updatedAt: at ?? nowIso() };
}

export function parseOpenboard(
  raw: unknown,
): { ok: true; data: OpenboardData } | { ok: false; error: string } {
  const parsed = openboardDataSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return { ok: false, error: parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot" };
}

export function payloadBytes(data: unknown): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

export function newBlock(type: string, ...rest: string[]): OpenboardBlock {
  const id = createId();
  switch (type) {
    case "heading": {
      const level = rest[0] === "1" || rest[0] === "3" ? Number(rest[0]) : 2;
      return { id, type: "heading", html: "", level: level as 1 | 2 | 3 };
    }
    case "code": {
      const lang = codeLanguages.find((l) => l === rest[0]) ?? "javascript";
      return { id, type: "code", lang, source: "" };
    }
    case "formula":
      return { id, type: "formula", tex: "" };
    case "chem":
      return { id, type: "chem", tex: "" };
    case "drawing":
      return { id, type: "drawing", scene: [] };
    case "image":
      return { id, type: "image", src: "", alt: "" };
    case "table":
      return { id, type: "table", header: true, rows: [["", ""], ["", ""], ["", ""]] };
    case "checklist":
      return { id, type: "checklist", items: [] };
    default:
      return { id, type: "text", html: "" };
  }
}
