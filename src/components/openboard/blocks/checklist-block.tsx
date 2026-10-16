"use client";

import { useCallback, useRef, type KeyboardEvent, type RefCallback } from "react";
import type { ChecklistBlock, ChecklistItem } from "@/lib/openboard/types";
import { createId } from "@/lib/openboard/types";
import { useI18n } from "@/components/i18n/LocaleProvider";

const MAX_ITEMS = 200;

export function ChecklistBlockEditor({
  block,
  onChange,
}: {
  block: ChecklistBlock;
  onChange: (next: ChecklistBlock) => void;
}) {
  const { t } = useI18n();
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  const update = (index: number, patch: Partial<ChecklistItem>) => {
    onChange({
      ...block,
      items: block.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (index: number) => {
    onChange({ ...block, items: block.items.filter((_, i) => i !== index) });
  };

  const insertAfter = (index: number): string => {
    const id = createId();
    const items = [...block.items];
    items.splice(index + 1, 0, { id, text: "", done: false });
    onChange({ ...block, items });
    return id;
  };

  const addItem = () => {
    const id = createId();
    onChange({ ...block, items: [...block.items, { id, text: "", done: false }] });
    requestAnimationFrame(() => inputRefs.current.get(id)?.focus());
  };

  const onKeyDown =
    (index: number) =>
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        e.preventDefault();
        const id = insertAfter(index);
        requestAnimationFrame(() => inputRefs.current.get(id)?.focus());
      }
    };

  const setRef = useCallback(
    (id: string): RefCallback<HTMLInputElement> =>
      (el) => {
        if (el) inputRefs.current.set(id, el);
        else inputRefs.current.delete(id);
      },
    [],
  );

  return (
    <div className="space-y-1.5">
      {block.items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => update(index, { done: e.target.checked })}
            className="size-4 shrink-0 cursor-pointer accent-blue-600"
          />
          <input
            ref={setRef(item.id)}
            value={item.text}
            maxLength={1000}
            placeholder={t("brdChecklistPlaceholder")}
            onChange={(e) => update(index, { text: e.target.value })}
            onKeyDown={onKeyDown(index)}
            className={
              item.done
                ? "w-full border-b border-transparent text-sm text-slate-500 line-through focus:border-blue-300 focus:outline-none"
                : "w-full border-b border-transparent text-sm text-slate-800 focus:border-blue-300 focus:outline-none"
            }
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            aria-label={t("brdBlockDelete")}
            className="shrink-0 rounded-md px-1 text-sm leading-4 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={block.items.length >= MAX_ITEMS}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + {t("brdChecklistAdd")}
      </button>
    </div>
  );
}
