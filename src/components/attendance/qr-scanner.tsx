"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { parseQrPayload, type QrScanPayload } from "./live-qr";
import { reportIssue } from "@/components/bugs/report";

const MAX_SCAN_SIZE = 768;

export function QrScanner({
  onDetected,
  onCancel,
}: {
  onDetected: (payload: QrScanPayload) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    detectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let detectTimer = 0;
    let noticeShown = false;

    function stop() {
      stopped = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(detectTimer);
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    }

    function decodeRegion(
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
    ): string | null {
      const scale = Math.min(1, MAX_SCAN_SIZE / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      context.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
      const frame = context.getImageData(0, 0, w, h);
      return jsQR(frame.data, w, h, { inversionAttempts: "attemptBoth" })?.data ?? null;
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
          let raw = decodeRegion(video, canvas, 0, 0, width, height);
          for (const ratio of [0.6, 0.35]) {
            if (raw) break;
            const cw = Math.floor(width * ratio);
            const ch = Math.floor(height * ratio);
            raw = decodeRegion(
              video,
              canvas,
              Math.floor((width - cw) / 2),
              Math.floor((height - ch) / 2),
              cw,
              ch,
            );
          }
          if (raw) {
            const payload = parseQrPayload(raw);
            if (payload) {
              stop();
              setDetected(true);
              try {
                navigator.vibrate?.(80);
              } catch {
                void 0;
              }
              detectTimer = window.setTimeout(() => {
                detectedRef.current(payload);
              }, 300);
              return;
            }
            if (!noticeShown && raw.includes("/attendance/check-in")) {
              noticeShown = true;
              setNotice(t("schQrInvalid"));
            }
          }
        }
      }
      raf = window.requestAnimationFrame(tick);
    }

    async function start() {
      setError(null);
      setSlow(false);
      setNotice(null);
      setDetected(false);
      const slowTimer = window.setTimeout(() => setSlow(true), 8000);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          window.clearTimeout(slowTimer);
          setError(t("schCameraUnsupported"));
          reportIssue({
            message: "Brauzerda getUserMedia mavjud emas (kamera qo'llab-quvvatlanmaydi)",
            label: "brauzer kamerani qo'llab-quvvatlamaydi",
            autoSend: true,
          });
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch (first) {
          if (first instanceof DOMException && first.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } else {
            throw first;
          }
        }
        const video = videoRef.current;
        if (!video) {
          window.clearTimeout(slowTimer);
          return;
        }
        video.srcObject = stream;
        await video.play();
        raf = window.requestAnimationFrame(tick);
      } catch (err) {
        window.clearTimeout(slowTimer);
        const name = err instanceof DOMException ? err.name : "Error";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError(t("schCameraPermission"));
          return;
        }
        let message: string;
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          message = t("schCameraNotFound");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          message = t("schCameraBusy");
        } else {
          message = t("schCameraFailed");
        }
        setError(message);
        reportIssue({
          message: `Kamera ochilmadi: ${name} — ${message}`,
          label: "kamera ochilmadi",
          autoSend: true,
        });
      }
    }

    void start();
    return stop;
  }, [attempt]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-square w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        <span
          className={
            detected
              ? "pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400"
              : "pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70"
          }
        />
        <span className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 animate-pulse bg-emerald-400/80" />
      </div>
      {error ? (
        <div className="space-y-2">
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">{error}</p>
          <Button variant="secondary" className="w-full" onClick={() => setAttempt((n) => n + 1)}>
            {t("schRetry")}
          </Button>
        </div>
      ) : detected ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">
          {t("schQrReadChecking")}
        </p>
      ) : notice ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
          {notice}
        </p>
      ) : (
        <div className="space-y-1 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {t("schQrSearching")}
          </p>
          {slow ? (
            <p className="text-xs text-amber-700">
              {t("schQrSlowHint")}
            </p>
          ) : (
            <p className="text-xs text-slate-500">{t("schQrCameraHint")}</p>
          )}
        </div>
      )}
      <Button variant="secondary" className="w-full" onClick={onCancel}>
        {t("schCancel")}
      </Button>
    </div>
  );
}
