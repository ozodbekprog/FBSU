"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { cn, fmtDate } from "@/lib/utils";
import { motion } from "motion/react";
import { apiFetch } from "@/lib/api";
import { requestBrowserLocation, type QrScanPayload } from "./live-qr";
import { QrScanner } from "./qr-scanner";
import { FaceScan, ensureFaceModels } from "@/components/face/face-scan";

type CheckInResult = {
  course: { id: string; title: string; slug: string };
  date: string;
  status?: string;
  reasons?: string[];
  checkout?: boolean;
};

const REASON_KEYS = {
  GEO_FAR: "schReasonGeoFar",
  GEO_MISSING: "schReasonGeoMissing",
  GEO_ACCURACY_LOW: "schReasonGeoAccuracyLow",
  IP_CHANGED: "schReasonIpChanged",
  IP_SHARED: "schReasonIpShared",
  VPN_SUSPECTED: "schReasonVpnSuspected",
  IP_GEO_MISMATCH: "schReasonIpGeoMismatch",
  CODE_USED: "schReasonCodeUsed",
  FACE_MISSING: "schReasonFaceMissing",
  FACE_MISMATCH: "schReasonFaceMismatch",
} as const;
type PendingBody = {
  token?: string;
  code?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
};

export function CheckInForm({
  initialPayload,
  faceEnrolled = false,
  compact = false,
}: {
  initialPayload?: QrScanPayload;
  faceEnrolled?: boolean;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "scanning" | "loading" | "face" | "success" | "suspicious" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingBody | null>(null);
  const [pop, setPop] = useState(false);
  const tokenSubmitted = useRef(false);
  const lastBodyRef = useRef<PendingBody | null>(null);

  async function send(body: PendingBody & { faceDescriptor?: number[] }) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    let response: Response;
    try {
      response = await apiFetch("/api/attendance/check-in", {
        method: "POST",
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      window.clearTimeout(timer);
      setStatus("error");
      setMessage(t("schNoServerResponse"));
      return;
    }
    window.clearTimeout(timer);
    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; data?: CheckInResult }
      | null;

    if (!response.ok || !json?.ok || !json.data) {
      setStatus("error");
      setMessage(json?.error ?? t("schCheckInError"));
      return;
    }

    setResult(json.data);
    setPop(false);
    const faceFailed =
      Array.isArray(json.data.reasons) &&
      (json.data.reasons.includes("FACE_MISSING") || json.data.reasons.includes("FACE_MISMATCH"));
    if (faceFailed && lastBodyRef.current) {
      setReasons([]);
      setPending(lastBodyRef.current);
      setMessage(t("schFaceRetryHint"));
      setStatus("face");
      return;
    }
    if (json.data.status === "SUSPICIOUS") {
      setReasons(Array.isArray(json.data.reasons) ? json.data.reasons : []);
      setStatus("suspicious");
    } else {
      setReasons([]);
      setStatus("success");
    }
    window.requestAnimationFrame(() => setPop(true));
  }

    async function submitScan(payload: QrScanPayload) {
    const token = payload.token?.trim() ?? "";
    const code = (payload.code ?? "").trim().toUpperCase();
    if (!token && !code) {
      setStatus("error");
      setMessage(t("schQrNotRead"));
      return;
    }

    setStatus("loading");
    setMessage(t("schQrReadLocating"));

    const location = await requestBrowserLocation();

    setMessage(t("schChecking"));

    const body: PendingBody = token
      ? location
        ? { token, lat: location.lat, lng: location.lng, accuracy: location.accuracy }
        : { token }
      : location
        ? { code, lat: location.lat, lng: location.lng, accuracy: location.accuracy }
        : { code };

    lastBodyRef.current = body;

    let needsFace = faceEnrolled;
    try {
      const faceResponse = await apiFetch("/api/face");
      const faceJson = (await faceResponse.json().catch(() => null)) as
        | { ok?: boolean; data?: { enrolled?: boolean } }
        | null;
      if (faceResponse.ok && faceJson?.ok) {
        needsFace = faceJson.data?.enrolled === true;
      }
    } catch {
      void 0;
    }

    if (needsFace) {
      setPending(body);
      setStatus("face");
      return;
    }

    await send(body);
  }

  useEffect(() => {
    if (!faceEnrolled) return;
    void ensureFaceModels().catch(() => void 0);
  }, [faceEnrolled]);

  useEffect(() => {
    if (tokenSubmitted.current) return;
    if (!initialPayload?.token && !initialPayload?.code) return;
    tokenSubmitted.current = true;
    queueMicrotask(() => void submitScan(initialPayload));
  }, [initialPayload]);

  if (status === "face" && pending) {
    return (
      <Card className="animate-fade-up relative mx-auto max-w-lg overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
        <CardBody className="space-y-5 px-6 py-8 sm:px-8">
          {message ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
              {message}
            </p>
          ) : null}
          <p className="text-center text-sm font-medium text-slate-700">{t("schFaceStep")}</p>
          <FaceScan
            onDescriptor={(descriptor) => {
              setStatus("loading");
              setMessage(t("schChecking"));
              void send({ ...pending, faceDescriptor: descriptor });
            }}
            onCancel={() => {
              setPending(null);
              setStatus("idle");
            }}
          />
        </CardBody>
      </Card>
    );
  }

  if (status === "success" && result) {
    return (
      <Card className="animate-fade-up relative mx-auto max-w-lg overflow-hidden border-emerald-100">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-gold-400" />
        <span className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-emerald-300/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -left-12 size-48 rounded-full bg-gold-300/15 blur-3xl" />
        <CardBody className="relative flex flex-col items-center gap-2.5 py-12 text-center">
          <span className="relative flex size-24 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/25" />
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.22 }}
              className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-8 ring-emerald-50"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "transition-transform duration-500 delay-150 ease-out",
                  pop ? "scale-100" : "scale-0",
                )}
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            </motion.span>
          </span>
          <p className="mt-2 text-xl font-semibold text-emerald-800">
            {result.checkout ? t("schCheckoutSuccess") : t("schAttendanceMarked")}
          </p>
          <p className="text-sm font-medium text-slate-700">{result.course.title}</p>
          <p className="text-sm text-slate-500">{fmtDate(`${result.date}T00:00:00.000Z`)}</p>
          <Button
            variant="secondary"
            className="mt-4 px-6"
            onClick={() => {
              setStatus("idle");
              setResult(null);
            }}
          >
            {t("schScanAgain")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (status === "suspicious" && result) {
    return (
      <Card className="animate-fade-up relative mx-auto max-w-lg overflow-hidden border-amber-200">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-gold-400" />
        <span className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-amber-300/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -left-12 size-48 rounded-full bg-gold-300/15 blur-3xl" />
        <CardBody className="relative flex flex-col items-center gap-2.5 py-12 text-center">
          <span className="relative flex size-24 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-amber-400/25" />
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.22 }}
              className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/40 ring-8 ring-amber-50"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "transition-transform duration-500 delay-150 ease-out",
                  pop ? "scale-100" : "scale-0",
                )}
              >
                <path d="M12 3 2 20h20L12 3Z" />
                <path d="M12 10v4" />
                <path d="M12 17.5h.01" />
              </svg>
            </motion.span>
          </span>
          <p className="mt-2 text-xl font-semibold text-amber-800">
            {t("schSuspiciousTitle")}
          </p>
          <p className="text-sm font-medium text-slate-700">{result.course.title}</p>
          <p className="text-sm text-slate-500">{fmtDate(`${result.date}T00:00:00.000Z`)}</p>
          {reasons.length > 0 ? (
            <ul className="mt-2 w-full space-y-1.5 rounded-2xl bg-amber-50 px-4 py-3 text-left">
              {reasons.map((reason) => {
                const reasonKey = REASON_KEYS[reason as keyof typeof REASON_KEYS];
                return (
                  <li key={reason} className="text-sm text-amber-800">
                    · {reasonKey ? t(reasonKey) : reason}
                  </li>
                );
              })}
            </ul>
          ) : null}
          <Button
            variant="secondary"
            className="mt-4 px-6"
            onClick={() => {
              setStatus("idle");
              setResult(null);
              setReasons([]);
              setMessage(null);
            }}
          >
            {t("schScanAgain")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (status === "scanning" || status === "loading") {
    return (
      <Card className="animate-fade-up relative mx-auto max-w-lg overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
        <CardBody className="space-y-5 px-6 py-8 sm:px-8">
          {status === "scanning" ? (
            <QrScanner
              onDetected={(payload) => {
                void submitScan(payload);
              }}
              onCancel={() => setStatus("idle")}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <span className="size-10 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600" />
              <p className="text-sm font-medium text-slate-600">
                {message ?? t("schChecking")}
              </p>
              <p className="text-xs text-slate-600">
                {t("schAllowLocation")}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="fb-qr">
        <span className="fb-qr-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01M17.5 21v.01M21 17.5v.01" />
          </svg>
        </span>
        <div className="fb-qr-copy">
          <b>{t("fbdCheckinTitle")}</b>
          <span>{t("fbdCheckinSubtitle")}</span>
          {message ? <span className="fb-qr-msg">{message}</span> : null}
        </div>
        <button
          type="button"
          className="fb-qr-btn"
          onClick={() => {
            setMessage(null);
            setStatus("scanning");
          }}
        >
          {t("schScanQr")}
        </button>
      </div>
    );
  }

  return (
    <Card className="animate-fade-up relative mx-auto max-w-lg overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-900 via-brand-500 to-gold-400" />
      <CardBody className="space-y-6 px-6 py-9 sm:px-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 shadow-sm ring-1 ring-brand-100">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M21 21v.01M17.5 21v.01M21 17.5v.01" />
            </svg>
          </span>
          <p className="text-base font-semibold text-slate-900">{t("schQrAttendanceHeading")}</p>
          <p className="max-w-sm text-sm text-slate-500">
            {t("schQrAttendanceHint")}
          </p>
        </div>

        {message ? (
          <p
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium",
              status === "error" ? "bg-rose-50 text-rose-700" : "text-slate-500",
            )}
          >
            {message}
          </p>
        ) : null}

        <Button
          size="lg"
          className="w-full py-3 text-base"
          onClick={() => {
            setMessage(null);
            setStatus("scanning");
          }}
        >
          {t("schScanQr")}
        </Button>

        {!faceEnrolled ? (
          <p className="text-center text-xs text-slate-500">
            {t("schFaceEnableHint")}{" "}
            <Link href="/face" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              Face ID
            </Link>
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
