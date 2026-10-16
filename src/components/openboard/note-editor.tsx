"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { createLabNote, newBlock, touchNote } from "@/lib/openboard/store";
import type { OpenboardBlock, OpenboardNote } from "@/lib/openboard/types";
import { TextBlockEditor } from "./blocks/text-block";
import { HeadingBlockEditor } from "./blocks/heading-block";
import { CodeBlockEditor } from "./blocks/code-block";
import { ImageBlockEditor } from "./blocks/image-block";
import { TableBlockEditor } from "./blocks/table-block";
import { ChecklistBlockEditor } from "./blocks/checklist-block";

function BlockPlaceholder() {
  return <div className="h-24 w-full animate-pulse rounded-xl bg-slate-50" />;
}

const FormulaBlockEditor = dynamic(
  () => import("./blocks/formula-block").then((mod) => mod.FormulaBlockEditor),
  { ssr: false, loading: () => <BlockPlaceholder /> },
);

const ChemBlockEditor = dynamic(
  () => import("./blocks/formula-block").then((mod) => mod.ChemBlockEditor),
  { ssr: false, loading: () => <BlockPlaceholder /> },
);

const DrawingBlockEditor = dynamic(
  () => import("./blocks/drawing-block").then((mod) => mod.DrawingBlockEditor),
  { ssr: false, loading: () => <BlockPlaceholder /> },
);

export function NoteEditor({
  note,
  onChange,
  onDelete,
  onDuplicate,
}: {
  note: OpenboardNote;
  onChange: (next: OpenboardNote) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const { t, locale } = useI18n();

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const commit = (next: OpenboardNote) => onChange(touchNote(next));

  const updateBlock = (id: string, block: OpenboardBlock) => {
    commit({
      ...note,
      blocks: note.blocks.map((current) => (current.id === id ? block : current)),
    });
  };

  const removeBlock = (id: string) => {
    commit({ ...note, blocks: note.blocks.filter((block) => block.id !== id) });
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = note.blocks.findIndex((block) => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= note.blocks.length) return;
    const blocks = [...note.blocks];
    const [moved] = blocks.splice(index, 1);
    blocks.splice(target, 0, moved);
    commit({ ...note, blocks });
  };

  const addBlock = (type: OpenboardBlock["type"]) => {
    commit({ ...note, blocks: [...note.blocks, newBlock(type)] });
  };

  const appendLab = () => {
    const label = {
      goal: t("brdLabGoal"),
      equipment: t("brdLabEquipment"),
      steps: t("brdLabSteps"),
      measurements: t("brdLabMeasurements"),
      calculation: t("brdLabCalculation"),
      conclusion: t("brdLabConclusion"),
      simLink: t("brdLabSimLink"),
    };
    const template = createLabNote(t("brdNewLab"), label);
    commit({ ...note, blocks: [...note.blocks, ...template.blocks] });
  };

  const updated = new Date(note.updatedAt);

  const blockOptions: { type: OpenboardBlock["type"]; label: string }[] = [
    { type: "text", label: t("brdBlockText") },
    { type: "heading", label: t("brdBlockHeading") },
    { type: "code", label: t("brdBlockCode") },
    { type: "formula", label: t("brdBlockFormula") },
    { type: "chem", label: t("brdBlockChem") },
    { type: "drawing", label: t("brdBlockDrawing") },
    { type: "image", label: t("brdBlockImage") },
    { type: "table", label: t("brdBlockTable") },
    { type: "checklist", label: t("brdBlockChecklist") },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <input
            value={note.title}
            onChange={(event) => commit({ ...note, title: event.target.value })}
            placeholder={t("brdNoteTitlePlaceholder")}
            className="w-full bg-transparent text-2xl font-semibold tracking-tight text-slate-900 placeholder:text-slate-300 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            {formatter.format(Number.isNaN(updated.getTime()) ? new Date() : updated)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(note.id)}
            title={t("brdNoteDuplicate")}
            aria-label={t("brdNoteDuplicate")}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t("brdNoteDeleteConfirm"))) onDelete(note.id);
            }}
            title={t("brdNoteDelete")}
            aria-label={t("brdNoteDelete")}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-1 px-3 py-4 sm:px-4">
        {note.blocks.map((block) => (
          <div
            key={block.id}
            className="group relative rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-slate-200"
          >
            {block.type === "text" ? <TextBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "heading" ? <HeadingBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "code" ? <CodeBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "formula" ? <FormulaBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "chem" ? <ChemBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "drawing" ? <DrawingBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "image" ? <ImageBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "table" ? <TableBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            {block.type === "checklist" ? <ChecklistBlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} /> : null}
            <div className="absolute -top-3.5 right-2 hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex">
              <button
                type="button"
                onClick={() => moveBlock(block.id, -1)}
                title={t("brdMoveUp")}
                aria-label={t("brdMoveUp")}
                className="inline-flex size-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveBlock(block.id, 1)}
                title={t("brdMoveDown")}
                aria-label={t("brdMoveDown")}
                className="inline-flex size-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                title={t("brdBlockDelete")}
                aria-label={t("brdBlockDelete")}
                className="inline-flex size-6 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t("brdAddBlock")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {blockOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => addBlock(option.type)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={appendLab}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            {t("brdBlockLab")}
          </button>
        </div>
      </div>
    </div>
  );
}
