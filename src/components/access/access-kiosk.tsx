"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Role } from "@prisma/client";
import jsQR from "jsqr";
import type { Dictionary } from "@/i18n/uz";
import { Badge, Button, Card, CardBody, Input } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { apiFetch } from "@/lib/api";
import { cn, fmtDateTime } from "@/lib/utils";

type Direction = "IN" | "OUT";

type ScanUser = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
};

type ScanData = {
  allowed: boolean;
  reason?: string;
  user?: ScanUser;
  direction?: Direction;
  at?: string;
  gate?: string;
};

type CameraErrorKey = "schCameraUnsupported" | "schCameraPermission" | "schCameraFailed";

const ROLE_LABEL_KEY: Record<Role, keyof Dictionary> = {
  ADMIN: "mscRoleAdmin",
  REKTOR: "mscRoleRector",
  PRO_RECTOR: "mscRoleProRector",
  DEKAN: "mscRoleDean",
  KAFEDRA_MUDIRI: "mscRoleHead",
  REGISTRAR: "mscRoleRegistrar",
  BUXGALTER: "payRoleBuxgalter",
  TYUTOR: "mscRoleTutor",
  TEACHER: "mscRoleTeacher",
  STUDENT: "mscRoleStudent",
  XODIM: "mscRoleStaff",
  OTA_ONA: "mscRoleParent",
};

const TAB_BASE =
  "flex items-center justify-center gap-2 rounded-2xl border px-4 py-5 text-base font-semibold transition-[background-color,border-color,color,box-shadow] duration-150";

export function AccessKiosk() {
  const { t } = useI18n();
  const [direction, setDirection] = useState<Direction>("IN");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanData | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorKey | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleTokenRef = useRef<(value: string) => void>(() => {});

  const handleToken = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value || value.length > 300) {
        setResult({ allowed: false, reason: "invalid" });
        return;
      }
      setBusy(true);
      try {
        const response = await apiFetch("/api/access/scan", {
          method: "POST",
          body: JSON.stringify({ token: value, direction, gate: "Asosiy kirish" }),
        });
        const json = (await response.json().catch(() => null)) as {
          ok?: boolean;
          data?: ScanData;
        } | null;
        if (json?.ok && json.data) {
          setResult(json.data);
        } else {
          setResult({ allowed: false, reason: "invalid" });
        }
      } catch {
        setResult({ allowed: false, reason: "invalid" });
      } finally {
        setBusy(false);
      }
    },
    [direction],
  );

  useEffect(() => {
    handleTokenRef.current = (value: string) => {
      void handleToken(value);
    };
  }, [handleToken]);

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => {
      setResult(null);
      setToken("");
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (!cameraOn) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(video, 0, 0, width, height);
            const frame = context.getImageData(0, 0, width, height);
            const decoded = jsQR(frame.data, width, height, {
              inversionAttempts: "attemptBoth",
            })?.data?.trim();
            if (decoded) {
              stopped = true;
              setCameraOn(false);
              handleTokenRef.current(decoded);
              return;
            }
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    const start = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("schCameraUnsupported");
          setCameraOn(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        const video = videoRef.current;
        if (!video) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }
        video.srcObject = stream;
        await video.play();
        raf = window.requestAnimationFrame(tick);
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setCameraError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "schCameraPermission"
            : "schCameraFailed",
        );
        setCameraOn(false);
      }
    };

    void start();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  }, [cameraOn]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleToken(token);
  }

  return (
    <>
      <Card>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection("IN")}
              className={cn(
                TAB_BASE,
                direction === "IN"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              <span aria-hidden>↑</span>
              {t("accIn")}
            </button>
            <button
              type="button"
              onClick={() => setDirection("OUT")}
              className={cn(
                TAB_BASE,
                direction === "OUT"
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50",
              )}
            >
              <span aria-hidden>↓</span>
              {t("accOut")}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">{t("accScanHint")}</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t("accManualInput")}
              maxLength={300}
              autoFocus
            />
            <Button
              type="submit"
              size="lg"
              disabled={busy || token.trim().length < 10}
              className="shrink-0"
            >
              {busy ? "..." : "Skanerlash"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCameraOn((value) => !value)}>
              {cameraOn ? "Kamerani yopish" : "Kamera"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setToken("");
                setResult(null);
              }}
            >
              {t("accReset")}
            </Button>
          </div>

          {cameraError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
              {t(cameraError)}
            </p>
          ) : null}

          {cameraOn ? (
            <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="aspect-square w-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <span className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/70" />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {result ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className={cn(
              "flex w-full max-w-md flex-col items-center gap-3 rounded-3xl p-8 text-center text-white shadow-2xl",
              result.allowed ? "bg-emerald-600" : "bg-rose-600",
            )}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-white/15 text-3xl font-semibold">
              {result.allowed ? "✓" : "✕"}
            </span>
            <p className="text-2xl font-semibold tracking-tight">
              {result.allowed
                ? result.direction === "OUT"
                  ? t("accGoodbye")
                  : t("accWelcome")
                : t("accDenied")}
            </p>
            {result.allowed && result.user ? (
              <>
                <p className="text-lg font-medium">{result.user.name}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={result.direction === "OUT" ? "amber" : "green"}>
                    {result.direction === "OUT" ? t("accOut") : t("accIn")}
                  </Badge>
                  <span className="text-sm text-white/80">
                    {t(ROLE_LABEL_KEY[result.user.role])}
                  </span>
                </div>
                <p className="text-sm text-white/80">{fmtDateTime(result.at)}</p>
              </>
            ) : null}
            {!result.allowed ? (
              <p className="text-sm text-white/90">
                {result.reason === "inactive" ? t("accDeniedInactive") : t("accDeniedInvalid")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
