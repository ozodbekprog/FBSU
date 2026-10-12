import { z } from "zod";

export const OPENBOARD_LIMITS = {
  maxNotes: 120,
  maxBlocksPerNote: 250,
  maxSceneElements: 4000,
  maxPreviewChars: 700_000,
  maxImageChars: 900_000,
  maxStringChars: 120_000,
  maxPayloadBytes: 9_000_000,
} as const;

const idSchema = z.string().trim().min(1).max(64);
const shortText = z.string().max(2_000);
const longText = z.string().max(OPENBOARD_LIMITS.maxStringChars);

export const codeLanguages = [
  "javascript",
  "math",
  "python",
  "sql",
  "c",
  "cpp",
  "cs",
  "java",
] as const;

export const textBlockSchema = z.object({
  id: idSchema,
  type: z.literal("text"),
  html: longText,
});

export const headingBlockSchema = z.object({
  id: idSchema,
  type: z.literal("heading"),
  html: shortText,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const codeBlockSchema = z.object({
  id: idSchema,
  type: z.literal("code"),
  lang: z.enum(codeLanguages),
  source: longText,
});

export const formulaBlockSchema = z.object({
  id: idSchema,
  type: z.literal("formula"),
  tex: shortText,
});

export const chemBlockSchema = z.object({
  id: idSchema,
  type: z.literal("chem"),
  tex: shortText,
});

export const drawingBlockSchema = z.object({
  id: idSchema,
  type: z.literal("drawing"),
  scene: z.array(z.unknown()).max(OPENBOARD_LIMITS.maxSceneElements),
  sceneAppState: z.record(z.string(), z.unknown()).optional(),
  preview: z.string().max(OPENBOARD_LIMITS.maxPreviewChars).optional(),
});

export const imageBlockSchema = z.object({
  id: idSchema,
  type: z.literal("image"),
  src: z.string().max(OPENBOARD_LIMITS.maxImageChars),
  alt: shortText,
  caption: shortText.optional(),
});

export const tableBlockSchema = z.object({
  id: idSchema,
  type: z.literal("table"),
  header: z.boolean(),
  rows: z
    .array(z.array(z.string().max(500)).max(12))
    .max(200),
});

export const checklistItemSchema = z.object({
  id: idSchema,
  text: z.string().max(1_000),
  done: z.boolean(),
});

export const checklistBlockSchema = z.object({
  id: idSchema,
  type: z.literal("checklist"),
  items: z.array(checklistItemSchema).max(200),
});

export const openboardBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  headingBlockSchema,
  codeBlockSchema,
  formulaBlockSchema,
  chemBlockSchema,
  drawingBlockSchema,
  imageBlockSchema,
  tableBlockSchema,
  checklistBlockSchema,
]);

export const openboardNoteSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  icon: z.string().max(8),
  blocks: z.array(openboardBlockSchema).max(OPENBOARD_LIMITS.maxBlocksPerNote),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

export const openboardDataSchema = z.object({
  v: z.literal(3),
  kind: z.literal("openboard"),
  notes: z.array(openboardNoteSchema).max(OPENBOARD_LIMITS.maxNotes),
});

export type CodeLanguage = (typeof codeLanguages)[number];
export type TextBlock = z.infer<typeof textBlockSchema>;
export type HeadingBlock = z.infer<typeof headingBlockSchema>;
export type CodeBlock = z.infer<typeof codeBlockSchema>;
export type FormulaBlock = z.infer<typeof formulaBlockSchema>;
export type ChemBlock = z.infer<typeof chemBlockSchema>;
export type DrawingBlock = z.infer<typeof drawingBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type TableBlock = z.infer<typeof tableBlockSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type ChecklistBlock = z.infer<typeof checklistBlockSchema>;
export type OpenboardBlock = z.infer<typeof openboardBlockSchema>;
export type OpenboardNote = z.infer<typeof openboardNoteSchema>;
export type OpenboardData = z.infer<typeof openboardDataSchema>;

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyOpenboard(): OpenboardData {
  return { v: 3, kind: "openboard", notes: [] };
}
