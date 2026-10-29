"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import {
  parseOfficeBody,
  type OfficeBody,
  type OfficeType,
  type SheetsBody,
  type SlidesBody,
  type WordBody,
} from "@/lib/office";
import { OfficeIcon } from "@/components/office/office-icon";
import { WordEditor } from "@/components/office/word-editor";
import { SheetsEditor } from "@/components/office/sheets-editor";
import { SlidesEditor } from "@/components/office/slides-editor";

type Props = {
  id: string;
  type: OfficeType;
  initialTitle: string;
  initialBody: string;
  updatedAt: string;
};

type SaveStatus = "saved" | "dirty" | "saving" | "error";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

const PRINT_STYLES = `
.office-print-only { display: none; }
@media print {
  @page { size: A4; margin: 12mm; }
  body * { visibility: hidden !important; }
  #office-print, #office-print * { visibility: visible !important; }
  #office-print { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff; }
  .office-no-print { display: none !important; }
  .office-print-only { display: block !important; }
}
`;

function isWordBody(body: OfficeBody): body is WordBody {
  return "html" in body;
}

function isSheetsBody(body: OfficeBody): body is SheetsBody {
  return "cells" in body;
}

function isSlidesBody(body: OfficeBody): body is SlidesBody {
  return "slides" in body;
}

export function OfficeEditor({ id, type, initialTitle, initialBody, updatedAt }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState(updatedAt);
  const [body] = useState<OfficeBody>(() => parseOfficeBody(type, initialBody));
  const bodyRef = useRef(initialBody);
  const titleRef = useRef(initialTitle);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "saved") return;
    function guard(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [status]);

  const typeLabel = (value: OfficeType) =>
    value === "word" ? t("ofsWord") : value === "sheets" ? t("ofsSheets") : t("ofsSlides");

  const save = useCallback(
    async (nextTitle: string, nextBody: string) => {
      setStatus("saving");
      setError(null);
      try {
        const response = await apiFetch(`/api/office/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: nextTitle.trim() || t("ofsUntitled"), body: nextBody }),
        });
        const payload = (await response.json().catch(() => null)) as ApiResult<{ updatedAt: string }> | null;
        if (!response.ok || !payload || !payload.ok) {
          throw new Error(payload && !payload.ok ? payload.error : t("ofsError"));
        }
        if (!mountedRef.current) return;
        setStatus("saved");
        setLastSaved(payload.data.updatedAt);
      } catch (cause) {
        if (!mountedRef.current) return;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : t("ofsError"));
      }
    },
    [id, t],
  );

  const schedule = useCallback(
    (nextTitle: string, nextBody: string) => {
      titleRef.current = nextTitle;
      bodyRef.current = nextBody;
      setStatus("dirty");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void save(titleRef.current, bodyRef.current);
      }, 800);
    },
    [save],
  );

  function handleTitle(value: string) {
    setTitle(value);
    schedule(value, bodyRef.current);
  }

  function handleBody(next: OfficeBody) {
    schedule(titleRef.current, JSON.stringify(next));
  }

  function saveNow() {
    if (timerRef.current) clearTimeout(timerRef.current);
    void save(titleRef.current, bodyRef.current);
  }

  return (
    <div className="space-y-4">
      <style>{PRINT_STYLES}</style>

      <div className="office-no-print flex flex-wrap items-center gap-3">
        <Link
          href="/office"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          ← {t("ofsBack")}
        </Link>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <OfficeIcon type={type} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{typeLabel(type)}</span>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={cn(
              "hidden items-center gap-1.5 text-xs sm:inline-flex",
              status === "error" ? "text-rose-600" : status === "saved" ? "text-emerald-600" : "text-amber-600",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "error" ? "bg-rose-500" : status === "saved" ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            {status === "saving" ? t("ofsSaving") : status === "saved" ? t("ofsSaved") : status === "error" ? t("ofsError") : t("ofsUnsaved")}
          </span>
          <span className="hidden text-xs text-slate-400 lg:block">
            {t("ofsUpdated")}: {fmtDateTime(lastSaved)}
          </span>
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            {t("ofsPrint")}
          </Button>
          <Button size="sm" onClick={saveNow} disabled={status === "saving"}>
            {t("ofsSave")}
          </Button>
        </div>
      </div>

      <input
        value={title}
        onChange={(event) => handleTitle(event.target.value)}
        placeholder={t("ofsUntitled")}
        aria-label={t("ofsSlideTitle")}
        className="office-no-print w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-2xl font-semibold tracking-tight text-brand-950 outline-none transition hover:border-slate-200 focus:border-brand-300 focus:bg-white"
      />

      {error ? (
        <p className="office-no-print rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div id="office-print">
        <h1 className="office-print-only mb-6 text-2xl font-semibold text-slate-900">{title}</h1>
        {type === "word" && isWordBody(body) ? (
          <WordEditor initial={body} onChange={handleBody} />
        ) : null}
        {type === "sheets" && isSheetsBody(body) ? (
          <SheetsEditor initial={body} onChange={handleBody} title={title} />
        ) : null}
        {type === "slides" && isSlidesBody(body) ? (
          <SlidesEditor initial={body} onChange={handleBody} />
        ) : null}
      </div>
    </div>
  );
}
