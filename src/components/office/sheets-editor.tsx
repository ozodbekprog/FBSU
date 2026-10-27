"use client";

import { useMemo, useRef, useState } from "react";
import { evaluate } from "mathjs";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  SHEET_MAX_COLS,
  SHEET_MAX_ROWS,
  sheetKey,
  type SheetAlign,
  type SheetCell,
  type SheetsBody,
} from "@/lib/office";

type Props = {
  initial: SheetsBody;
  onChange: (body: SheetsBody) => void;
  title: string;
};

const FUNCTION_RE = /(SUM|AVERAGE|MIN|MAX|COUNT)\(\s*([A-Z]{1,2}[1-9]\d{0,2})\s*:\s*([A-Z]{1,2}[1-9]\d{0,2})\s*\)/g;
const REF_RE = /\b[A-Z]{1,2}[1-9]\d{0,2}\b/g;

function refToIndex(ref: string): { col: number; row: number } | null {
  const match = /^([A-Z]{1,2})(\d{1,3})$/.exec(ref.toUpperCase());
  if (!match) return null;
  let col = 0;
  for (const char of match[1]) col = col * 26 + (char.charCodeAt(0) - 64);
  return { col: col - 1, row: Number(match[2]) - 1 };
}

function colLabel(index: number): string {
  return sheetKey(index, 0).replace(/\d+$/, "");
}

function parseNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function round(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

function evaluateSheet(data: SheetsBody): Record<string, string> {
  const cache = new Map<string, number | string>();
  const visiting = new Set<string>();
  const display: Record<string, string> = {};

  function readCell(key: string): number | string {
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const cell = data.cells[key];
    if (!cell || cell.v.trim() === "") {
      cache.set(key, 0);
      return 0;
    }
    const raw = cell.v.trim();
    const result = raw.startsWith("=") ? runFormula(key, raw.slice(1)) : parseNumber(raw) ?? raw;
    cache.set(key, result);
    return result;
  }

  function rangeValues(startRef: string, endRef: string): Array<number | string> {
    const start = refToIndex(startRef);
    const end = refToIndex(endRef);
    if (!start || !end) return [];
    const values: Array<number | string> = [];
    const rowFrom = Math.min(start.row, end.row);
    const rowTo = Math.max(start.row, end.row);
    const colFrom = Math.min(start.col, end.col);
    const colTo = Math.max(start.col, end.col);
    if ((rowTo - rowFrom + 1) * (colTo - colFrom + 1) > 5000) return [];
    for (let row = rowFrom; row <= rowTo; row += 1) {
      for (let col = colFrom; col <= colTo; col += 1) {
        values.push(readCell(sheetKey(col, row)));
      }
    }
    return values;
  }

  function runFormula(key: string, formula: string): number | string {
    if (visiting.has(key)) return "#AYLANMA";
    visiting.add(key);
    try {
      let expression = formula.toUpperCase().replace(FUNCTION_RE, (_match, fn: string, startRef: string, endRef: string) => {
        const values = rangeValues(startRef, endRef);
        const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        if (fn === "SUM") return String(round(numbers.reduce((sum, value) => sum + value, 0)));
        if (fn === "AVERAGE") return numbers.length ? String(round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length)) : "0";
        if (fn === "MIN") return numbers.length ? String(Math.min(...numbers)) : "0";
        if (fn === "MAX") return numbers.length ? String(Math.max(...numbers)) : "0";
        return String(numbers.length);
      });

      expression = expression.replace(REF_RE, (ref) => {
        const value = readCell(ref);
        return typeof value === "number" && Number.isFinite(value) ? String(value) : "0";
      });

      const result = evaluate(expression);
      if (typeof result === "number") {
        return Number.isFinite(result) ? round(result) : "#XATO";
      }
      if (typeof result === "string" || typeof result === "boolean") return String(result);
      return "#XATO";
    } catch {
      return "#XATO";
    } finally {
      visiting.delete(key);
    }
  }

  for (const key of Object.keys(data.cells)) {
    if (!data.cells[key] || data.cells[key].v.trim() === "") continue;
    const value = readCell(key);
    display[key] = typeof value === "number" ? String(round(value)) : value;
  }

  return display;
}

function csvCell(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function SheetsEditor({ initial, onChange, title }: Props) {
  const { t } = useI18n();
  const [data, setData] = useState<SheetsBody>(initial);
  const [selected, setSelected] = useState("A1");
  const formulaRef = useRef<HTMLInputElement>(null);
  const display = useMemo(() => evaluateSheet(data), [data]);

  const selectedCell = data.cells[selected] ?? { v: "" };

  function commit(next: SheetsBody) {
    setData(next);
    onChange(next);
  }

  function updateCell(key: string, patch: Partial<SheetCell>) {
    const current = data.cells[key] ?? { v: "" };
    const merged: SheetCell = { ...current, ...patch };
    if (merged.v === "" && !merged.bold && !merged.italic && !merged.align) {
      const cells = { ...data.cells };
      delete cells[key];
      commit({ ...data, cells });
      return;
    }
    commit({ ...data, cells: { ...data.cells, [key]: merged } });
  }

  function cycleAlign() {
    const current = selectedCell.align ?? "left";
    const next: SheetAlign = current === "left" ? "center" : current === "center" ? "right" : "left";
    updateCell(selected, { align: next });
  }

  function addRows() {
    commit({ ...data, rows: Math.min(SHEET_MAX_ROWS, data.rows + 5) });
  }

  function addCols() {
    commit({ ...data, cols: Math.min(SHEET_MAX_COLS, data.cols + 2) });
  }

  function moveSelection(rowDelta: number, colDelta: number) {
    const current = refToIndex(selected) ?? { col: 0, row: 0 };
    const nextRow = Math.max(0, Math.min(data.rows - 1, current.row + rowDelta));
    const nextCol = Math.max(0, Math.min(data.cols - 1, current.col + colDelta));
    setSelected(sheetKey(nextCol, nextRow));
  }

  function exportCsv() {
    const lines: string[] = [];
    for (let row = 0; row < data.rows; row += 1) {
      const values: string[] = [];
      for (let col = 0; col < data.cols; col += 1) {
        const key = sheetKey(col, row);
        values.push(csvCell(display[key] ?? ""));
      }
      lines.push(values.join(","));
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const slug = title.trim().toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-").replace(/^-|-$/g, "");
    anchor.href = url;
    anchor.download = `${slug || "jadval"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="office-no-print flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{selected}</span>
        <span className="text-xs font-medium text-slate-400">fx</span>
        <input
          ref={formulaRef}
          value={selectedCell.v}
          onChange={(event) => updateCell(selected, { v: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              moveSelection(1, 0);
            }
            if (event.key === "Tab") {
              event.preventDefault();
              moveSelection(0, 1);
            }
          }}
          placeholder={t("ofsFormula")}
          className="h-8 min-w-[180px] flex-1 rounded-lg border border-slate-200 px-2 font-mono text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={t("ofsBold")}
            onClick={() => updateCell(selected, { bold: !selectedCell.bold })}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition",
              selectedCell.bold ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            B
          </button>
          <button
            type="button"
            title={t("ofsItalic")}
            onClick={() => updateCell(selected, { italic: !selectedCell.italic })}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border text-sm italic transition",
              selectedCell.italic ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            I
          </button>
          <button
            type="button"
            title="Align"
            onClick={cycleAlign}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-slate-600 transition hover:bg-slate-50"
          >
            {selectedCell.align === "center" ? "↔" : selectedCell.align === "right" ? "⟶" : "⟵"}
          </button>
          <button
            type="button"
            title={t("ofsClear")}
            onClick={() => updateCell(selected, { v: "", bold: false, italic: false, align: undefined })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs text-rose-500 transition hover:bg-rose-50"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="office-no-print flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">
          {data.rows} × {data.cols}
        </span>
        <Button size="sm" variant="secondary" onClick={addRows}>
          {t("ofsAddRows")}
        </Button>
        <Button size="sm" variant="secondary" onClick={addCols}>
          {t("ofsAddCols")}
        </Button>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          {t("ofsExportCsv")}
        </Button>
        <span className="ml-auto hidden text-xs text-slate-400 lg:block">{t("ofsHintSheets")}</span>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-8 w-10 border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400" />
              {Array.from({ length: data.cols }, (_, col) => (
                <th
                  key={col}
                  className="sticky top-0 z-10 h-8 min-w-[96px] border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500"
                >
                  {colLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: data.rows }, (_, row) => (
              <tr key={row}>
                <th className="sticky left-0 z-10 h-8 w-10 border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-400">
                  {row + 1}
                </th>
                {Array.from({ length: data.cols }, (_, col) => {
                  const key = sheetKey(col, row);
                  const cell = data.cells[key];
                  const value = display[key] ?? "";
                  const numeric = value !== "" && parseNumber(value) !== null;
                  const align = cell?.align ?? (numeric ? "right" : "left");
                  return (
                    <td key={col} className="border border-slate-200 p-0">
                      <button
                        type="button"
                        onClick={() => setSelected(key)}
                        onDoubleClick={() => {
                          setSelected(key);
                          formulaRef.current?.focus();
                          formulaRef.current?.select();
                        }}
                        onKeyDown={(event) => {
                          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                            event.preventDefault();
                            updateCell(key, { v: event.key });
                            formulaRef.current?.focus();
                            requestAnimationFrame(() => formulaRef.current?.setSelectionRange(1, 1));
                          }
                          if (event.key === "Enter") {
                            event.preventDefault();
                            formulaRef.current?.focus();
                          }
                        }}
                        title={cell?.v ?? ""}
                        className={cn(
                          "block h-8 w-full min-w-[96px] truncate px-2 text-sm outline-none transition",
                          align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left",
                          cell?.bold ? "font-semibold" : "",
                          cell?.italic ? "italic" : "",
                          selected === key
                            ? "bg-brand-50 ring-2 ring-inset ring-brand-500"
                            : "bg-white hover:bg-slate-50",
                        )}
                      >
                        {value}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
