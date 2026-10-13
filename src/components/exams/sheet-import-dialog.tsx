"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Button, Textarea } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Imtihon sessiyasiga talabalar ro'yxatini import qilish oynasi.
 *
 * Ikki rejim:
 *   - "Oddiy" — foydalanuvchi ismlarni qatorma-qator yozadi/ko'chiradi.
 *   - "AI" — tartibsiz matn LLM orqali tozalanadi (chatdan ko'chirilgan
 *     ro'yxat, ortiqcha so'zlar, raqamlash).
 *
 * Oqim: matn → "Tekshirish" (hech narsa yozilmaydi) → natijani ko'rish →
 * "Ro'yxatga qo'shish". Shunday qilib foydalanuvchi avval nima
 * qo'shilishini ko'radi.
 */

type PreviewRow = {
  studentId: string;
  name: string;
  input: string;
  seat?: string;
  alreadyAdded: boolean;
};

type PreviewData = {
  parsed: number;
  usedAi: boolean;
  matched: PreviewRow[];
  unmatched: string[];
  ambiguous: { input: string; candidates: { id: string; name: string }[] }[];
  enrolledCount: number;
};

export function SheetImportDialog({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "ai">("text");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const close = useCallback(() => {
    setOpen(false);
    setPreview(null);
    setError(null);
    setSelected({});
  }, []);

  // Escape bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function request(body: Record<string, unknown>) {
    const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)?.[1];
    const res = await fetch(`/api/exams/sessions/${sessionId}/sheets/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {}),
      },
      body: JSON.stringify(body),
    });
    return (await res.json().catch(() => null)) as
      | { ok: boolean; error?: string; data?: PreviewData & { created?: number; skipped?: number } }
      | null;
  }

  async function check() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const json = await request({ mode, text, preview: true });
      if (!json?.ok || !json.data) {
        setError(json?.error ?? t("grdExImportError"));
        return;
      }
      setPreview(json.data);
      if (mode === "ai" && !json.data.usedAi) setNotice(t("grdExImportAiFallback"));
    } catch {
      setError(t("grdExImportError"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const selectedIds = Object.entries(selected)
        .filter(([, on]) => on)
        .map(([id]) => id);
      const json = await request({ mode, text, selectedIds });
      if (!json?.ok) {
        setError(json?.error ?? t("grdExImportError"));
        return;
      }
      setNotice(
        t("grdExImportResult", {
          created: json.data?.created ?? 0,
          skipped: json.data?.skipped ?? 0,
        }),
      );
      setPreview(null);
      setText("");
      router.refresh();
    } catch {
      setError(t("grdExImportError"));
    } finally {
      setSaving(false);
    }
  }

  const matched = preview?.matched ?? [];
  const newRows = matched.filter((r) => !r.alreadyAdded);
  const unmatched = preview?.unmatched ?? [];
  const ambiguous = preview?.ambiguous ?? [];

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        {t("grdExImport")}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setMode("ai");
          setOpen(true);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
        </svg>
        {t("grdExImportAi")}
      </Button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[95] bg-slate-950/45 backdrop-blur-sm" aria-hidden="true" onClick={close} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t("grdExImportTitle")}
                className="animate-fade-up fixed top-1/2 left-1/2 z-[96] flex max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl dark:border-slate-200/20 dark:bg-[#0e1729]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("grdExImportTitle")}</p>
                    {preview ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t("grdExImportEnrolled", { count: preview.enrolledCount })}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("grdExImport")}
                    className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  {/* Rejim tanlash */}
                  <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {(["text", "ai"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        data-import-mode={m}
                        aria-pressed={mode === m}
                        onClick={() => {
                          setMode(m);
                          setPreview(null);
                        }}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          mode === m
                            ? "bg-white text-brand-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400",
                        )}
                      >
                        {m === "text" ? t("grdExImportModeText") : t("grdExImportModeAi")}
                      </button>
                    ))}
                  </div>

                  <p className="mb-2 text-xs text-slate-500">
                    {mode === "ai" ? t("grdExImportAiHint") : t("grdExImportTextHint")}
                  </p>

                  <Textarea
                    rows={7}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("grdExImportPlaceholder")}
                    data-import-text=""
                  />

                  {error ? (
                    <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                      {error}
                    </p>
                  ) : null}
                  {notice ? (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                      {notice}
                    </p>
                  ) : null}

                  {/* Natija */}
                  {preview ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        {t("grdExImportMatched")}: {newRows.length}
                        {matched.length - newRows.length > 0
                          ? ` · ${matched.length - newRows.length} ${t("grdExImportAlready")}`
                          : ""}
                      </p>
                      <ul className="max-h-44 space-y-1 overflow-y-auto text-sm">
                        {matched.map((row) => (
                          <li
                            key={row.studentId}
                            className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60"
                          >
                            <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{row.name}</span>
                            {row.seat ? (
                              <span className="shrink-0 text-xs text-slate-500">{row.seat}</span>
                            ) : null}
                            {row.alreadyAdded ? (
                              <span className="shrink-0 text-[11px] text-slate-400">{t("grdExImportAlready")}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>

                      {ambiguous.length > 0 ? (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold tracking-wide text-amber-600 uppercase">
                            {t("grdExImportAmbiguous")}: {ambiguous.length}
                          </p>
                          <ul className="space-y-2 text-sm">
                            {ambiguous.map((item) => (
                              <li key={item.input} className="rounded-lg bg-amber-50/60 px-2.5 py-2 dark:bg-amber-500/10">
                                <p className="mb-1 text-xs text-amber-800 dark:text-amber-300">«{item.input}»</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.candidates.map((c) => (
                                    <label
                                      key={c.id}
                                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs dark:border-amber-500/30 dark:bg-slate-800"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!selected[c.id]}
                                        onChange={(e) =>
                                          setSelected((prev) => ({ ...prev, [c.id]: e.target.checked }))
                                        }
                                        className="size-3.5 rounded border-slate-300 accent-brand-700"
                                      />
                                      {c.name}
                                    </label>
                                  ))}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {unmatched.length > 0 ? (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold tracking-wide text-rose-600 uppercase">
                            {t("grdExImportUnmatched")}: {unmatched.length}
                          </p>
                          <p className="text-xs leading-relaxed text-slate-500">{unmatched.join(" · ")}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
                  <Button size="sm" variant="secondary" onClick={close}>
                    {t("commonCancel")}
                  </Button>
                  {preview ? (
                    <Button size="sm" onClick={confirm} disabled={saving}>
                      {saving ? t("grdExImportChecking") : t("grdExImportConfirm")}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={check} disabled={busy || !text.trim()}>
                      {busy ? t("grdExImportChecking") : t("grdExImportCheck")}
                    </Button>
                  )}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
