"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Badge, Button, Card, CardBody, CardHeader, Label, Select, Table } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { fmtDateTime } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import {
  formatSecondsLeft,
  requestBrowserLocation,
  type BrowserLocation,
} from "./live-qr";
import { SessionPresent } from "./session-present";

type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "SUSPICIOUS" | "LEFT_EARLY";

type SessionMark = {
  studentId: string;
  name: string;
  status: AttendanceStatusValue;
};

type SessionRow = {
  id: string;
  code: string;
  date: string;
  expiresAt: string;
  createdAt: string;
  active: boolean;
  finalizedAt?: string | null;
  isException?: boolean;
  kind?: "CHECK_IN" | "CHECK_OUT";
  marked: SessionMark[];
};

const STATUS_TONES: Record<AttendanceStatusValue, "green" | "rose" | "amber" | "blue"> = {
  PRESENT: "green",
  ABSENT: "rose",
  LATE: "amber",
  EXCUSED: "blue",
  SUSPICIOUS: "amber",
  LEFT_EARLY: "amber",
};

const STATUS_LABEL_KEYS = {
  PRESENT: "schStatusPresent",
  ABSENT: "schStatusAbsent",
  LATE: "schStatusLate",
  EXCUSED: "schStatusExcused",
  SUSPICIOUS: "schStatusSuspicious",
  LEFT_EARLY: "schStatusLeftEarly",
} as const;

const MINUTE_OPTIONS = [5, 10, 15, 30, 60];

const TIMER_RADIUS = 23;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SessionPanel({
  courseId,
  courseTitle,
  studentCount,
  autoStart = false,
}: {
  courseId: string;
  courseTitle?: string;
  studentCount: number;
  autoStart?: boolean;
}) {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [presentOpen, setPresentOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);
  const [teacherLocation, setTeacherLocation] = useState<BrowserLocation | null>(null);
  const [dynamicQr, setDynamicQr] = useState<{
    token: string;
    url: string;
    expiresIn: number;
    fetchedAt: number;
  } | null>(null);
  const [dynamicImg, setDynamicImg] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await apiFetch(
      `/api/attendance/sessions?courseId=${encodeURIComponent(courseId)}`,
    );
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; data?: { sessions: SessionRow[] } }
      | null;
    if (!response.ok || !json?.ok || !json.data) {
      setError(json?.error ?? t("schSessionsLoadError"));
      return;
    }
    setSessions(json.data.sessions);
    setError(null);
    setLoaded(true);
  }, [courseId, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = sessions[0] ?? null;
  const hasActive = sessions.some((session) => session.active);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!loaded || !autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (!sessions.some((session) => session.active)) {
      window.history.replaceState(null, "", window.location.pathname);
      void startSession();
    }
  }, [loaded, autoStart, sessions]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [hasActive, refresh]);

  const latestCode = latest?.code ?? null;
  useEffect(() => {
    if (!latestCode) return;
    let cancelled = false;
    const checkInUrl = `${window.location.origin}/attendance/check-in?code=${latestCode}`;
    QRCode.toDataURL(checkInUrl, { width: 640, margin: 3, errorCorrectionLevel: "L" })
      .then((url) => {
        if (!cancelled) setQr({ code: latestCode, url });
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [latestCode]);

  useEffect(() => {
    let cancelled = false;
    void requestBrowserLocation().then((location) => {
      if (!cancelled && location) setTeacherLocation(location);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestId = latest?.id ?? null;

  const remainingMs = useMemo(() => {
    if (!latest) return 0;
    return new Date(latest.expiresAt).getTime() - now;
  }, [latest, now]);
  const latestActive = Boolean(latest && remainingMs > 0);

  useEffect(() => {
    if (!latestId || !latestActive) {
      setDynamicQr(null);
      setDynamicImg(null);
      setTokenError(null);
      return;
    }
    let cancelled = false;
    async function fetchToken() {
      const response = await apiFetch(`/api/attendance/sessions/${latestId}/token`, {
        method: "POST",
        body: JSON.stringify(
          teacherLocation ? { lat: teacherLocation.lat, lng: teacherLocation.lng } : {},
        ),
      });
      const json = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; data?: { token: string; url: string; expiresIn: number } }
        | null;
      if (cancelled) return;
      if (!response.ok || !json?.ok || !json.data) {
        setTokenError(json?.error ?? t("schDynamicQrError"));
        return;
      }
      setTokenError(null);
      setDynamicQr({
        token: json.data.token,
        url: json.data.url,
        expiresIn: json.data.expiresIn,
        fetchedAt: Date.now(),
      });
    }
    void fetchToken();
    const timer = window.setInterval(() => {
      void fetchToken();
    }, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [latestId, latestActive, teacherLocation]);

  useEffect(() => {
    if (!dynamicQr) {
      setDynamicImg(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(dynamicQr.url, { width: 640, margin: 3, errorCorrectionLevel: "L" })
      .then((url) => {
        if (!cancelled) setDynamicImg(url);
      })
      .catch(() => {
        if (!cancelled) setDynamicImg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dynamicQr]);

  const tokenRemainingMs = useMemo(() => {
    if (!dynamicQr) return 0;
    return dynamicQr.expiresIn * 1000 - (now - dynamicQr.fetchedAt);
  }, [dynamicQr, now]);

  const remainingRatio = useMemo(() => {
    if (!latest) return 0;
    const total = new Date(latest.expiresAt).getTime() - new Date(latest.createdAt).getTime();
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, remainingMs / total));
  }, [latest, remainingMs]);

  async function startSession(kind: "CHECK_IN" | "CHECK_OUT" = "CHECK_IN") {
    setBusy(true);
    setError(null);
    const response = await apiFetch("/api/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ courseId, minutes, kind }),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("schSessionStartError"));
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function closeSession() {
    if (!latest) return;
    setBusy(true);
    setError(null);
    const response = await apiFetch(`/api/attendance/sessions/${latest.id}`, { method: "DELETE" });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("schSessionCloseError"));
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  async function reopenAsException() {
    if (!window.confirm(t("schExceptionConfirm"))) return;
    setBusy(true);
    setError(null);
    const response = await apiFetch("/api/attendance/sessions", {
      method: "POST",
      body: JSON.stringify({ courseId, minutes, exception: true }),
    });
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !json?.ok) {
      setError(json?.error ?? t("schSessionStartError"));
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
  }

  const history = sessions.slice(1, 6);

  const qrSrc =
    dynamicImg ?? (qr && latest && qr.code === latest.code ? qr.url : null);
  const tokenRatio =
    dynamicQr && dynamicQr.expiresIn > 0
      ? Math.max(0, Math.min(1, tokenRemainingMs / (dynamicQr.expiresIn * 1000)))
      : 0;

  return (
    <Card>
      <CardHeader
        title={t("schQrSessionTitle")}
        subtitle={t("schQrSessionSubtitle")}
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refresh();
            }}
          >
            {t("schRefresh")}
          </Button>
        }
      />
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label>{t("schDuration")}</Label>
            <Select
              value={minutes}
              disabled={busy}
              onChange={(event) => setMinutes(Number(event.target.value))}
            >
              {MINUTE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t("schMinutes", { count: option })}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => {
              void startSession("CHECK_IN");
            }}
            disabled={busy}
          >
            {hasActive ? t("schNewSession") : t("schStartSession")}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void startSession("CHECK_OUT");
            }}
            disabled={busy}
          >
            {t("schStartCheckout")}
          </Button>
          {latestActive ? (
            <Button
              variant="secondary"
              onClick={() => {
                void closeSession();
              }}
              disabled={busy}
            >
              {t("schClose")}
            </Button>
          ) : null}
          {latestActive ? (
            <Button
              onClick={() => {
                void document.documentElement.requestFullscreen?.().catch(() => void 0);
                setPresentOpen(true);
              }}
            >
              {t("schPresentOpen")}
            </Button>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
              className="size-4 accent-amber-500"
            />
            {t("schDemoMode")}
          </label>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        {latest ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
            <div className="mx-auto w-full max-w-96">
              {latestActive ? (
                <>
                  <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-lift ring-1 ring-slate-900/5">
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2">
                      {qrSrc ? (
                        <img
                          src={qrSrc}
                          alt={t("schQrAlt")}
                          className="aspect-square w-full rounded-xl"
                        />
                      ) : (
                        <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />
                      )}
                    </div>
                  </div>
                  <p className="mt-5 text-center text-xs text-slate-600">
                    {t("schQrScanByStudents")}
                  </p>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-700">{t("schPanelClosed")}</p>
                  <p className="mt-1 text-xs text-slate-500">{t("schQrClosedHint")}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {latest.kind === "CHECK_OUT" ? (
                  <Badge tone="amber">{t("schKindCheckOut")}</Badge>
                ) : (
                  <Badge tone="blue">{t("schKindCheckIn")}</Badge>
                )}
                {latestActive ? (
                  <Badge tone="green" className="shadow-sm shadow-emerald-500/20">
                    {t("schActive")}
                  </Badge>
                ) : (
                  <Badge tone="slate">{t("schClosed")}</Badge>
                )}
                {latest.isException ? <Badge tone="gold">{t("schExceptionBadge")}</Badge> : null}
                {latestActive ? <Badge tone="blue">{t("schDynamicQr10s")}</Badge> : null}
                {latestActive ? (
                  <span className="relative inline-flex size-16 items-center justify-center">
                    <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={TIMER_RADIUS}
                        fill="none"
                        strokeWidth="3.5"
                        className="stroke-gold-300/35"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r={TIMER_RADIUS}
                        fill="none"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${remainingRatio * TIMER_CIRCUMFERENCE} ${TIMER_CIRCUMFERENCE}`}
                        className="stroke-gold-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.45)]"
                      />
                    </svg>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-gold-800">
                      {formatRemaining(remainingMs)}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">
                    {t("schEndedAt", { date: fmtDateTime(latest.expiresAt) })}
                  </span>
                )}
                {latestActive && dynamicQr ? (
                  <span
                    className="relative inline-flex size-16 items-center justify-center"
                    title={t("schTokenRefreshTitle")}
                  >
                    <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r={TIMER_RADIUS}
                        fill="none"
                        strokeWidth="3.5"
                        className="stroke-brand-100"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r={TIMER_RADIUS}
                        fill="none"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeDasharray={`${tokenRatio * TIMER_CIRCUMFERENCE} ${TIMER_CIRCUMFERENCE}`}
                        className="stroke-brand-600"
                      />
                    </svg>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-brand-800">
                      {formatSecondsLeft(tokenRemainingMs)}
                    </span>
                  </span>
                ) : null}
              </div>
              {latestActive && !teacherLocation ? (
                <p className="text-xs text-slate-500">
                  {t("schLocationNotGranted")}
                </p>
              ) : null}
              {tokenError ? <p className="text-xs text-rose-600">{tokenError}</p> : null}

              {!latestActive && latest.finalizedAt ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t("schAutoFinalizedNote")}
                </p>
              ) : null}
              {!latestActive && !hasActive && latest.finalizedAt ? (
                <Button variant="secondary" onClick={() => void reopenAsException()} disabled={busy}>
                  {t("schExceptionReopen")}
                </Button>
              ) : null}

              <div>
                <p className="text-sm font-medium text-slate-800">
                  {t("schMarked")}
                  <span className="font-semibold text-brand-800">{latest.marked.length}</span>
                  {studentCount ? (
                    <span className="text-slate-600"> / {studentCount}</span>
                  ) : null}
                </p>
                {latest.marked.length === 0 ? (
                  <p className="mt-1.5 text-sm text-slate-500">
                    {t("schNobodyMarked")}
                  </p>
                ) : (
                  <ul className="mt-2.5 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                    {latest.marked.map((mark) => (
                      <li key={mark.studentId}>
                        <Badge
                          tone={STATUS_TONES[mark.status]}
                          className="px-2.5 py-1 shadow-sm ring-1 ring-black/[0.03]"
                        >
                          {mark.name} · {t(STATUS_LABEL_KEYS[mark.status])}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-slate-600">
                {t("schAutoRefresh30")}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {t("schNoSessionYet")}
          </p>
        )}

        {history.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {t("schRecentSessions")}
            </p>
            <Table>
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <th className="py-2.5 pr-3 text-left font-medium">{t("schDate")}</th>
                  <th className="px-3 py-2.5 text-left font-medium">{t("schStatusCol")}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{t("schMarkedCol")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-slate-50 transition-colors duration-150 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="py-2.5 pr-3 text-xs text-slate-500">
                      {fmtDateTime(session.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      {session.active ? (
                        <Badge tone="green">{t("schActive")}</Badge>
                      ) : (
                        <Badge tone="slate">{t("schClosed")}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">
                      {session.marked.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : null}
      </CardBody>
      {mounted && presentOpen && latest && latestActive
        ? createPortal(
            <SessionPresent
              courseId={courseId}
              courseTitle={courseTitle ?? t("schQrSessionTitle")}
              sessionId={latest.id}
              sessionKind={latest.kind ?? "CHECK_IN"}
              expiresAt={latest.expiresAt}
              studentCount={studentCount}
              demoMode={demoMode}
              onClose={() => setPresentOpen(false)}
            />,
            document.body,
          )
        : null}
    </Card>
  );
}
