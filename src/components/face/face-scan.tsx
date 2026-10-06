"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type LandmarkPoint = { x: number; y: number };
type LandmarksLike = {
  getLeftEye: () => LandmarkPoint[];
  getRightEye: () => LandmarkPoint[];
};
type FaceApi = typeof import("@vladmandic/face-api");
type ModelProgress = { loaded: number; total: number; ready: boolean };

const EAR_CLOSED = 0.21;
const EAR_OPEN = 0.24;
const BLINK_TIMEOUT_MS = 12_000;
const DETECT_INTERVAL_MS = 130;

let modelsPromise: Promise<FaceApi> | null = null;
let modelProgress: ModelProgress = { loaded: 0, total: 3, ready: false };
const progressListeners = new Set<(progress: ModelProgress) => void>();

function emitProgress() {
  for (const listener of progressListeners) listener(modelProgress);
}

function subscribeProgress(listener: (progress: ModelProgress) => void) {
  progressListeners.add(listener);
  listener(modelProgress);
  return () => {
    progressListeners.delete(listener);
  };
}

export function ensureFaceModels(): Promise<FaceApi> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      const tf = faceapi.tf as unknown as {
        setBackend: (backend: string) => Promise<boolean>;
        ready: () => Promise<void>;
      };
      try {
        await tf.setBackend("webgl");
      } catch {
        void 0;
      }
      await tf.ready();
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      modelProgress = { loaded: 1, total: 3, ready: false };
      emitProgress();
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      modelProgress = { loaded: 2, total: 3, ready: false };
      emitProgress();
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      modelProgress = { loaded: 3, total: 3, ready: true };
      emitProgress();
      return faceapi;
    })().catch((error: unknown) => {
      modelsPromise = null;
      modelProgress = { loaded: 0, total: 3, ready: false };
      emitProgress();
      throw error;
    });
  }
  return modelsPromise;
}

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
  const descriptorRef = useRef(onDescriptor);
  const [status, setStatus] = useState<"loading" | "searching" | "blink" | "found" | "noblink" | "error">(
    "loading",
  );
  const [cameraOn, setCameraOn] = useState(false);
  const [progress, setProgress] = useState<ModelProgress>({ loaded: 0, total: 3, ready: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    descriptorRef.current = onDescriptor;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    let closedSeen = false;
    let blinked = false;
    let blinkDeadline = 0;
    const unsubscribe = subscribeProgress(setProgress);

    function stop() {
      stopped = true;
      window.clearTimeout(timer);
      unsubscribe();
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    }

    async function start() {
      setStatus("loading");
      setCameraOn(false);
      closedSeen = false;
      blinked = false;
      blinkDeadline = 0;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("error");
          return;
        }
        const models = ensureFaceModels();
        const camera = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (stopped) {
          for (const track of camera.getTracks()) track.stop();
          return;
        }
        stream = camera;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = camera;
        await video.play().catch(() => void 0);
        if (stopped) return;
        setCameraOn(true);

        const faceapi = await models;
        if (stopped) return;

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 });
        try {
          await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();
        } catch {
          void 0;
        }
        if (stopped) return;
        setStatus("searching");

        async function tick() {
          if (stopped) return;
          const videoEl = videoRef.current;
          if (!videoEl || videoEl.readyState < videoEl.HAVE_ENOUGH_DATA) {
            timer = window.setTimeout(tick, 120);
            return;
          }
          try {
            const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks();
            if (stopped) return;
            if (!result?.landmarks) {
              if (blinkDeadline > 0 && Date.now() > blinkDeadline) {
                setStatus("noblink");
                return;
              }
              timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
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
              setStatus("found");
              try {
                navigator.vibrate?.(80);
              } catch {
                void 0;
              }
              const full = await faceapi
                .detectSingleFace(videoEl, options)
                .withFaceLandmarks()
                .withFaceDescriptor();
              if (stopped) return;
              if (!full?.descriptor) {
                setStatus("noblink");
                return;
              }
              const descriptor = Array.from(full.descriptor);
              window.setTimeout(() => {
                if (!stopped) descriptorRef.current(descriptor);
              }, 420);
              return;
            }
            if (Date.now() > blinkDeadline) {
              setStatus("noblink");
              return;
            }
          } catch {
            void 0;
          }
          timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
        }

        timer = window.setTimeout(tick, 0);
      } catch {
        if (!stopped) setStatus("error");
      }
    }

    void start();
    return stop;
  }, [attempt]);

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
  const steps = [
    { label: t("schFaceStepCamera"), done: cameraOn },
    { label: t("schFaceStepModels"), done: progress.ready },
    { label: t("schFaceStepReady"), done: progress.ready && cameraOn },
  ];

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
              ? "pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)] transition-colors duration-300"
              : status === "found"
                ? "pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)] transition-colors duration-300"
                : "pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-white/70 transition-colors duration-300"
          }
        />

        {status === "loading" ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/65 backdrop-blur-[2px] animate-fade-in">
            <div className="flex w-60 flex-col items-center gap-4">
              <span className="relative flex size-20 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400/40" />
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/15 border-t-brand-300" />
                <svg
                  className="relative text-white/90"
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8" />
                  <path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8" />
                  <path d="M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16" />
                  <path d="M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16" />
                  <circle cx="9" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
                  <path d="M9.2 14.6a4 4 0 0 0 5.6 0" />
                </svg>
              </span>
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold text-white">{t("schFaceLoading")}</p>
                <p className="text-[11px] leading-snug text-white/60">{t("schFaceModelHint")}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {steps.map((step) => (
                  <span
                    key={step.label}
                    className={
                      step.done
                        ? "flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-medium text-emerald-100 transition-colors duration-300"
                        : "flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/60 transition-colors duration-300"
                    }
                  >
                    {step.done ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="size-1.5 rounded-full bg-white/40" />
                    )}
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {status === "searching" || status === "blink" ? (
          <span className="pointer-events-none absolute inset-x-8 top-[12%] h-0.5 animate-scanline rounded-full bg-gradient-to-r from-transparent via-cyan-300/90 to-transparent" />
        ) : null}

        {status === "blink" ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-4 flex animate-fade-in items-center justify-center gap-1.5 text-center text-xs font-semibold text-amber-300">
            <svg className="animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {t("schFaceBlinkHint")}
          </span>
        ) : null}

        {status === "found" ? (
          <div className="absolute inset-0 grid animate-fade-in place-items-center bg-emerald-950/35">
            <span className="relative flex size-24 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/50" />
              <span className="relative grid size-16 animate-pop-in place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 ring-8 ring-emerald-50/90">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <p
        key={status}
        className={
          isError
            ? "animate-fade-in rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700"
            : "animate-fade-in text-center text-sm font-medium text-slate-600"
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
