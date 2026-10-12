"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { DrawingBlock } from "@/lib/openboard/types";
import { DrawingEditor } from "./drawing-editor";

export function DrawingBlockEditor({
  block,
  onChange,
}: {
  block: DrawingBlock;
  onChange: (next: DrawingBlock) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {block.preview ? (
        <img
          src={block.preview}
          alt=""
          className="h-44 w-full rounded-xl border border-slate-200 bg-white object-contain"
        />
      ) : (
        <div className="grid h-44 place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-400">
          {t("brdDrawEmpty")}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{block.scene.length}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
        >
          {t("brdDrawOpen")}
        </button>
      </div>
      {open ? (
        <DrawingEditor
          block={block}
          onSave={(next) => onChange({ ...block, ...next })}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
