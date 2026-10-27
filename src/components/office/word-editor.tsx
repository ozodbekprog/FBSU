"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { WordBody } from "@/lib/office";

type Props = {
  initial: WordBody;
  onChange: (body: WordBody) => void;
};

type Tool = {
  label: string;
  title: string;
  run: () => void;
  className?: string;
};

const WORD_PRINT_STYLES = `
@media print {
  .office-word-shell { background: #ffffff !important; padding: 0 !important; }
  .office-word-page { max-width: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; }
  .office-word-content { min-height: 0 !important; }
}
`;

export function WordEditor({ initial, onChange }: Props) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState(0);

  useEffect(() => {
    const text = editorRef.current?.innerText ?? "";
    setWords(text.trim() ? text.trim().split(/\s+/).length : 0);
  }, []);

  function emit() {
    const html = editorRef.current?.innerHTML ?? "";
    const text = editorRef.current?.innerText ?? "";
    setWords(text.trim() ? text.trim().split(/\s+/).length : 0);
    onChange({ version: 1, html });
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    emit();
  }

  function addLink() {
    const url = window.prompt("https://", "https://");
    if (url && url !== "https://") command("createLink", url);
  }

  const tools: Tool[] = [
    { label: "B", title: t("ofsBold"), run: () => command("bold"), className: "font-bold" },
    { label: "I", title: t("ofsItalic"), run: () => command("italic"), className: "italic" },
    { label: "U", title: "Underline", run: () => command("underline"), className: "underline" },
    { label: "S", title: "Strikethrough", run: () => command("strikeThrough"), className: "line-through" },
    { label: "H1", title: "H1", run: () => command("formatBlock", "<h1>"), className: "text-xs font-semibold" },
    { label: "H2", title: "H2", run: () => command("formatBlock", "<h2>"), className: "text-xs font-semibold" },
    { label: "P", title: "Paragraph", run: () => command("formatBlock", "<p>"), className: "text-xs" },
    { label: "•", title: t("ofsBullet"), run: () => command("insertUnorderedList") },
    { label: "1.", title: t("ofsNumbered"), run: () => command("insertOrderedList") },
    { label: "⟵", title: "Align left", run: () => command("justifyLeft") },
    { label: "↔", title: "Align center", run: () => command("justifyCenter") },
    { label: "⟶", title: "Align right", run: () => command("justifyRight") },
    { label: "🔗", title: t("ofsLink"), run: addLink },
    { label: "↺", title: t("ofsUndo"), run: () => command("undo") },
    { label: "↻", title: t("ofsRedo"), run: () => command("redo") },
    { label: "✕", title: t("ofsClear"), run: () => command("removeFormat") },
  ];

  return (
    <div className="office-word-shell bg-slate-100 py-4 sm:py-8">
      <style>{WORD_PRINT_STYLES}</style>
      <div className="office-no-print mx-auto mb-4 flex max-w-[860px] flex-wrap items-center gap-1.5 px-3 sm:px-0">
        {tools.map((tool) => (
          <button
            key={tool.title + tool.label}
            type="button"
            title={tool.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95",
              tool.className,
            )}
          >
            {tool.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          {words} {t("ofsWordCount")}
        </span>
      </div>
      <p className="office-no-print mx-auto mb-3 max-w-[860px] px-3 text-xs text-slate-500 sm:px-0">
        {t("ofsHintWord")}
      </p>

      <div className="office-word-page mx-auto w-full max-w-[820px] rounded-xl bg-white px-6 py-8 shadow-[0_2px_8px_rgba(16,24,40,0.06),0_20px_50px_-24px_rgba(29,52,96,0.25)] sm:px-14 sm:py-12">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={emit}
          dangerouslySetInnerHTML={{ __html: initial.html }}
          className="office-word-content min-h-[70vh] text-[15px] leading-7 text-slate-800 outline-none [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:my-3 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc"
        />
      </div>
    </div>
  );
}
