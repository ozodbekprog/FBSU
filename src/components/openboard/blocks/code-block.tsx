"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  runJavaScript,
  runMath,
  runnableLanguage,
  type CodeRunResult,
} from "@/lib/openboard/code-runner";
import { codeLanguages, type CodeBlock, type CodeLanguage } from "@/lib/openboard/types";

const LANG_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript",
  math: "Math (mathjs)",
  python: "Python",
  sql: "SQL",
  c: "C",
  cpp: "C++",
  cs: "C#",
  java: "Java",
};

const MAX_TEXTAREA_HEIGHT = 480;

export function CodeBlockEditor({
  block,
  onChange,
}: {
  block: CodeBlock;
  onChange: (next: CodeBlock) => void;
}) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [result, setResult] = useState<CodeRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const height = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${height}px`;
  }, [block.source]);

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    const finish = (runResult: CodeRunResult) => {
      setResult(runResult);
      setRunning(false);
    };
    if (block.lang === "math") {
      void runMath(block.source).then(finish);
    } else {
      void runJavaScript(block.source).then(finish);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(block.source)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };

  const canRun = runnableLanguage(block.lang);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <select
          title={t("brdCodeLang")}
          value={block.lang}
          onChange={(event) =>
            onChange({
              ...block,
              lang: event.target.value as CodeLanguage,
              source: block.source,
            })
          }
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
        >
          {codeLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {LANG_LABELS[lang]}
            </option>
          ))}
        </select>
        {canRun ? (
          <button
            type="button"
            title={t("brdCodeRun")}
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-brand-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {running ? t("brdCodeRunning") : t("brdCodeRun")}
          </button>
        ) : null}
        <button
          type="button"
          title={t("brdCodeCopy")}
          onClick={handleCopy}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? t("brdCodeCopied") : t("brdCodeCopy")}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={block.source}
        placeholder={t("brdCodePlaceholder")}
        onChange={(event) => onChange({ ...block, source: event.target.value })}
        spellCheck={false}
        className="max-h-[480px] w-full overflow-auto rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none"
      />
      {result !== null ? (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-slate-500">
            {t("brdCodeOutput")}
          </p>
          <pre
            className={`overflow-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-white px-3 py-2 font-mono text-sm ${
              result.ok ? "text-slate-800" : "text-rose-600"
            }`}
          >
            {result.lines.join("\n")}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
