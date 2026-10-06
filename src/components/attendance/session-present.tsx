"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Badge, Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { fmtDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

type Mark = { studentId: string; name: string; status: string };

type SessionsResponse = {
  ok?: boolean;
  data?: { sessions: { id: string; marked: Mark[] }[] };
};

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SessionPresent({
  courseId,
  courseTitle,
  sessionId,
  sessionKind,
  expiresAt,
  studentCount,
  demoMode,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  sessionId: string;
  sessionKind: "CHECK_IN" | "CHECK_OUT";
  expiresAt: string;
  studentCount: number;
  demoMode: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [token, setToken] = useState<{ fetchedAt: number; expiresIn: number } | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const toastTimerRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => void 0);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function fetchToken() {
      const response = await apiFetch(`/api/attendance/sessions/${sessionId}/token`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { url: string; expiresIn: number } }
        | null;
      if (cancelled || !response.ok || !json?.ok || !json.data) return;
      const url = await QRCode.toDataURL(json.data.url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "L",
      }).catch(() => null);
      if (cancelled || !url) return;
      setToken({ fetchedAt: Date.now(), expiresIn: json.data.expiresIn });
      setQrSrc(url);
    }
    void fetchToken();
    const timer = window.setInterval(() => void fetchToken(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  const loadMarks = useCallback(async () => {
    const response = await apiFetch(
      `/api/attendance/sessions?courseId=${encodeURIComponent(courseId)}`,
    );
    const json = (await response.json().catch(() => null)) as SessionsResponse | null;
    if (!response.ok || !json?.ok || !json.data) return;
    const session = json.data.sessions.find((row) => row.id === sessionId);
    if (!session) return;
    const next = session.marked ?? [];
    const seen = seenRef.current;
    if (!initializedRef.current) {
      for (const mark of next) seen.add(mark.studentId);
      initializedRef.current = true;
    } else {
      const fresh = next.filter((mark) => !seen.has(mark.studentId));
      if (fresh.length > 0) {
        for (const mark of fresh) seen.add(mark.studentId);
        const last = fresh[fresh.length - 1];
        setToast(t("schPresentArrived", { name: last.name }));
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
      }
    }
    setMarks(next);
  }, [courseId, sessionId, t]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    async function poll() {
      await loadMarks();
      if (!cancelled) timer = window.setTimeout(poll, 3_500);
    }
    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(toastTimerRef.current);
    };
  }, [loadMarks]);

  async function simulate() {
    setSimulating(true);
    setDemoError(null);
    const response = await apiFetch(`/api/attendance/sessions/${sessionId}/simulate`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    setSimulating(false);
    if (!response.ok || !json?.ok) {
      setDemoError(json?.error ?? t("schDemoEmpty"));
      return;
    }
    await loadMarks();
  }

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const tokenRatio =
    token && token.expiresIn > 0
      ? Math.max(0, Math.min(1, (token.expiresIn * 1000 - (now - token.fetchedAt)) / (token.expiresIn * 1000)))
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 text-white">
      {toast ? (
        <div className="fixed left-1/2 top-6 z-10 -translate-x-1/2 animate-pop-in rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-900/40">
          {toast}
        </div>
      ) : null}
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 p-5 lg:p-10">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
              {t("schPresentTitle")}
            </p>
            <h2 className="truncate text-2xl font-semibold lg:text-3xl">{courseTitle}</h2>
            <p className="mt-0.5 text-sm text-white/60">
              {fmtDate(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)}
            </p>
          </div>
          <Badge tone="blue">{sessionKind === "CHECK_OUT" ? t("schKindCheckOut") : t("schKindCheckIn")}</Badge>
          <Badge tone="green" className="animate-pulse">
            {t("schActive")}
          </Badge>
          {demoMode ? <Badge tone="amber">{t("schDemoBadge")}</Badge> : null}
          <Button variant="secondary" onClick={onClose}>
            {t("schPresentExit")}
          </Button>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[560px] rounded-3xl bg-white p-4 shadow-2xl shadow-black/40">
              {qrSrc ? (
                <img src={qrSrc} alt={t("schQrAlt")} className="aspect-square w-full rounded-2xl" />
              ) : (
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-slate-200" />
              )}
            </div>
            <div className="w-full max-w-[560px] space-y-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gold-400 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${tokenRatio * 100}%` }}
                />
              </div>
              <p className="text-center text-sm font-medium text-white/75">{t("schPresentScanHint")}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
                {t("schPresentCheckedIn")}
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {marks.length}
                {studentCount ? <span className="text-xl text-white/50"> / {studentCount}</span> : null}
              </p>
            </div>

            <div className="flex-1 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              {marks.length === 0 ? (
                <p className="text-sm text-white/60">{t("schPresentWaiting")}</p>
              ) : (
                <ul className="flex max-h-[42vh] flex-wrap content-start gap-2 overflow-y-auto">
                  {marks.map((mark) => (
                    <li key={mark.studentId} className="animate-pop-in">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/10">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        {mark.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {demoMode ? (
              <div className="space-y-2.5 rounded-3xl border border-dashed border-amber-300/40 bg-amber-400/10 p-5">
                <p className="text-xs leading-relaxed text-amber-100/90">{t("schDemoIntro")}</p>
                <Button className="w-full" onClick={() => void simulate()} disabled={simulating}>
                  {simulating ? t("schDemoSimulating") : t("schDemoSimulate")}
                </Button>
                {demoError ? <p className="text-xs text-rose-300">{demoError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="flex items-center justify-between text-xs text-white/50">
          <span>
            {t("schPresentEndsIn")}:{" "}
            <span className="font-mono text-sm tabular-nums text-white/85">
              {formatRemaining(remainingMs)}
            </span>
          </span>
          <span className="hidden sm:inline">{t("schPresentEscHint")}</span>
        </footer>
      </div>
    </div>
  );
}
