"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type LandmarkPoint = { x: number; y: number };
type LandmarksLike = {
  getLeftEye: () => LandmarkPoint[];
  getRightEye: () => LandmarkPoint[];
};

const EAR_CLOSED = 0.21;
const EAR_OPEN = 0.24;
const BLINK_TIMEOUT_MS = 12_000;

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks: LandmarksLike): number {
  const measure = (eye: LandmarkPoint[]) => {
    if (eye.length < 6) return 0.3;
    const vertical = distance(eye[1], eye[5]) + distance(eye[2], eye[4]);
    const horizontal = 2 * distance(eye[0], eye[3]);
    return horizontal === 0 ? 0.3 : vertical / horizontal;
  };
  return (measure(landmarks.getLeftEye()) + measure(landmarks.getRightEye())) / 2;
}

export function FaceScan({
  onDescriptor,
  onCancel,
}: {
  onDescriptor: (descriptor: number[]) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "searching" | "blink" | "found" | "noblink" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    let closedSeen = false;
    let blinked = false;
    let blinkDeadline = 0;

    function stop() {
      stopped = true;
      window.clearInterval(timer);
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    }

    async function start() {
      setStatus("loading");
      closedSeen = false;
      blinked = false;
      blinkDeadline = 0;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("error");
          return;
        }
        const faceapi = await import("@vladmandic/face-api");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        if (stopped) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("searching");
        timer = window.setInterval(async () => {
          if (stopped) return;
          const videoEl = videoRef.current;
          if (!videoEl || videoEl.readyState < videoEl.HAVE_ENOUGH_DATA) return;
          try {
            const result = await faceapi
              .detectSingleFace(
                videoEl,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }),
              )
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (stopped) return;
            if (!result?.descriptor) {
              if (blinkDeadline > 0 && Date.now() > blinkDeadline) {
                window.clearInterval(timer);
                setStatus("noblink");
              }
              return;
            }
            if (blinkDeadline === 0) {
              blinkDeadline = Date.now() + BLINK_TIMEOUT_MS;
              setStatus("blink");
            }
            const ear = eyeAspectRatio(result.landmarks);
            if (ear < EAR_CLOSED) {
              closedSeen = true;
            } else if (closedSeen && ear > EAR_OPEN) {
              blinked = true;
            }
            if (blinked) {
              window.clearInterval(timer);
              setStatus("found");
              try {
                navigator.vibrate?.(80);
              } catch {
                void 0;
              }
              const descriptor = Array.from(result.descriptor as Float32Array);
              window.setTimeout(() => {
                if (!stopped) onDescriptor(descriptor);
              }, 350);
              return;
            }
            if (Date.now() > blinkDeadline) {
              window.clearInterval(timer);
              setStatus("noblink");
            }
          } catch {
            void 0;
          }
        }, 500);
      } catch {
        if (!stopped) setStatus("error");
      }
    }

    void start();
    return stop;
  }, [attempt, onDescriptor]);

  const statusText =
    status === "loading"
      ? t("schFaceLoading")
      : status === "searching"
        ? t("schFaceSearching")
        : status === "blink"
          ? t("schFaceBlink")
          : status === "found"
            ? t("schFaceFound")
            : status === "noblink"
              ? t("schFaceNoBlink")
              : t("schFacePermission");

  const isError = status === "error" || status === "noblink";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-square w-full -scale-x-100 object-cover"
        />
        <span
          className={
            status === "blink"
              ? "pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-amber-400"
              : "pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-white/70"
          }
        />
        {status === "found" ? (
          <span className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-emerald-400" />
        ) : null}
        {status === "blink" ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs font-semibold text-amber-300">
            {t("schFaceBlinkHint")}
          </span>
        ) : null}
      </div>
      <p
        className={
          isError
            ? "rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700"
            : "text-center text-sm font-medium text-slate-600"
        }
      >
        {statusText}
      </p>
      <p className="text-center text-xs text-slate-500">{t("schFaceScoreHint")}</p>
      {isError ? (
        <Button variant="secondary" className="w-full" onClick={() => setAttempt((n) => n + 1)}>
          {t("schFaceRetry")}
        </Button>
      ) : null}
      {onCancel ? (
        <Button variant="ghost" className="w-full" onClick={onCancel}>
          {t("schFaceCancel")}
        </Button>
      ) : null}
    </div>
  );
}
