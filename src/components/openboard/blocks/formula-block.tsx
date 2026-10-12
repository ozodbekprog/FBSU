"use client";

import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";

import { useMemo } from "react";
import katex from "katex";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { Textarea } from "@/components/ui";
import type { ChemBlock, FormulaBlock } from "@/lib/openboard/types";

const FORMULA_CHIPS = [
  "\\frac{a}{b}",
  "\\sqrt{x}",
  "\\sum_{i=1}^{n}",
  "\\int_a^b f(x)\\,dx",
  "\\alpha, \\beta, \\theta",
  "x^2 + y^2 = r^2",
];

const CHEM_CHIPS = [
  "2H2 + O2 -> 2H2O",
  "CuSO4·5H2O",
  "CH3COOH <=> CH3COO^- + H^+",
  "Fe2O3 + 3CO -> 2Fe + 3CO2",
];

function TexEditor({
  tex,
  onChange,
  placeholder,
  chips,
  wrapCe,
}: {
  tex: string;
  onChange: (next: string) => void;
  placeholder: string;
  chips: readonly string[];
  wrapCe: boolean;
}) {
  const { t } = useI18n();
  const empty = tex.trim().length === 0;

  const html = useMemo(() => {
    if (empty) return null;
    const source = wrapCe && !tex.includes("\\ce") ? `\\ce{${tex}}` : tex;
    try {
      return katex.renderToString(source, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [tex, empty, wrapCe]);

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={tex}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(tex ? `${tex} ${chip}` : chip)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        {empty ? (
          <p className="text-sm text-slate-400">{t("brdFormulaEmpty")}</p>
        ) : html !== null ? (
          <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className="text-sm text-rose-600">{tex}</code>
        )}
      </div>
    </div>
  );
}

export function FormulaBlockEditor({
  block,
  onChange,
}: {
  block: FormulaBlock;
  onChange: (next: FormulaBlock) => void;
}) {
  const { t } = useI18n();
  return (
    <TexEditor
      tex={block.tex}
      onChange={(tex) => onChange({ ...block, tex })}
      placeholder={t("brdFormulaPlaceholder")}
      chips={FORMULA_CHIPS}
      wrapCe={false}
    />
  );
}

export function ChemBlockEditor({
  block,
  onChange,
}: {
  block: ChemBlock;
  onChange: (next: ChemBlock) => void;
}) {
  const { t } = useI18n();
  return (
    <TexEditor
      tex={block.tex}
      onChange={(tex) => onChange({ ...block, tex })}
      placeholder={t("brdChemPlaceholder")}
      chips={CHEM_CHIPS}
      wrapCe
    />
  );
}
