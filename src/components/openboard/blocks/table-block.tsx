"use client";

import type { TableBlock } from "@/lib/openboard/types";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const MAX_COLS = 8;

export function TableBlockEditor({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (next: TableBlock) => void;
}) {
  const { t } = useI18n();
  const cols = Math.max(1, block.rows[0]?.length ?? 0);
  const rowCount = block.rows.length;

  const setCell = (row: number, col: number, value: string) => {
    onChange({
      ...block,
      rows: block.rows.map((cells, r) =>
        r === row ? cells.map((cell, c) => (c === col ? value : cell)) : cells,
      ),
    });
  };

  const addRow = () => {
    onChange({
      ...block,
      rows: [...block.rows, Array.from({ length: cols }, () => "")],
    });
  };

  const addCol = () => {
    if (cols >= MAX_COLS) return;
    onChange({ ...block, rows: block.rows.map((cells) => [...cells, ""]) });
  };

  const removeRow = () => {
    if (rowCount <= 1) return;
    onChange({ ...block, rows: block.rows.slice(0, -1) });
  };

  const removeCol = () => {
    if (cols <= 1) return;
    onChange({ ...block, rows: block.rows.map((cells) => cells.slice(0, -1)) });
  };

  const buttonClass =
    "rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-2">
      <div
        className="grid min-w-0 gap-px overflow-x-auto rounded-xl border border-slate-200 bg-slate-200"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {block.rows.flatMap((cells, r) =>
          cells.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              value={cell}
              maxLength={500}
              onChange={(e) => setCell(r, c, e.target.value)}
              className={cn(
                "min-w-0 w-full bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300",
                r === 0 && block.header && "bg-slate-100 font-semibold",
              )}
            />
          )),
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className={buttonClass}>
          {t("brdTableAddRow")}
        </button>
        <button type="button" onClick={addCol} disabled={cols >= MAX_COLS} className={buttonClass}>
          {t("brdTableAddCol")}
        </button>
        <button type="button" onClick={removeRow} disabled={rowCount <= 1} className={buttonClass}>
          {t("brdTableRemoveRow")}
        </button>
        <button type="button" onClick={removeCol} disabled={cols <= 1} className={buttonClass}>
          {t("brdTableRemoveCol")}
        </button>
      </div>
    </div>
  );
}
