"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { sanitizeHtml } from "@/lib/openboard/sanitize-browser";
import type { TextBlock } from "@/lib/openboard/types";

type ToolbarAction =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "code"
  | "blockquote";

function execAction(action: ToolbarAction): void {
  if (action === "code") {
    document.execCommand("formatBlock", false, "code");
    return;
  }
  if (action === "blockquote") {
    const current = document.queryCommandValue("formatBlock");
    const next = current === "blockquote" ? "p" : "blockquote";
    document.execCommand("formatBlock", false, next);
    return;
  }
  document.execCommand(action, false);
}

export function TextBlockEditor({
  block,
  onChange,
}: {
  block: TextBlock;
  onChange: (next: TextBlock) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const lastBlockId = useRef<string | null>(null);

  useEffect(() => {
    if (ref.current && lastBlockId.current !== block.id) {
      ref.current.innerHTML = block.html;
    }
    lastBlockId.current = block.id;
  }, [block.id, block.html]);

  const toolbar: Array<{ action: ToolbarAction; label: string; mark: string }> =
    [
      { action: "bold", label: t("brdBold"), mark: "B" },
      { action: "italic", label: t("brdItalic"), mark: "I" },
      { action: "underline", label: t("brdUnderline"), mark: "U" },
      { action: "strikeThrough", label: t("brdStrike"), mark: "S" },
      { action: "insertUnorderedList", label: t("brdBulletList"), mark: "•" },
      { action: "insertOrderedList", label: t("brdNumberList"), mark: "1." },
      { action: "code", label: t("brdInlineCode"), mark: "</>" },
      { action: "blockquote", label: t("brdQuote"), mark: "❝" },
    ];

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-0.5">
        {toolbar.map((item) => (
          <button
            key={item.action}
            type="button"
            title={item.label}
            onMouseDown={(event) => {
              event.preventDefault();
              execAction(item.action);
              if (ref.current) {
                onChange({ ...block, html: sanitizeHtml(ref.current.innerHTML) });
              }
            }}
            className="min-w-6 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {item.mark}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={t("brdTextPlaceholder")}
        onInput={(event) => {
          onChange({
            ...block,
            html: sanitizeHtml(event.currentTarget.innerHTML),
          });
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        className="text-sm leading-6 text-slate-800 focus:outline-none empty:before:block empty:before:content-[attr(data-placeholder)] empty:before:text-slate-500"
      />
    </div>
  );
}
