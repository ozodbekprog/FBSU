"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { sanitizeHtml } from "@/lib/openboard/sanitize-browser";
import type { HeadingBlock } from "@/lib/openboard/types";

const LEVEL_STYLES: Record<1 | 2 | 3, string> = {
  1: "text-xl font-bold",
  2: "text-lg font-semibold",
  3: "text-base font-semibold",
};

export function HeadingBlockEditor({
  block,
  onChange,
}: {
  block: HeadingBlock;
  onChange: (next: HeadingBlock) => void;
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

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={t("brdBlockHeading")}
      onInput={(event) => {
        onChange({
          ...block,
          html: sanitizeHtml(event.currentTarget.innerHTML),
        });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      className={`${LEVEL_STYLES[block.level]} focus:outline-none empty:before:block empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400`}
    />
  );
}
