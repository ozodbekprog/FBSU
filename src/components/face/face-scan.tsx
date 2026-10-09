"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type LandmarkPoint = { x: number; y: number };
type LandmarksLike = {
  getLeftEye: () => LandmarkPoint[];
  getRightEye: () => LandmarkPoint[];
  getNose: () => LandmarkPoint[];
  getMouth: () => LandmarkPoint[];
};
type FaceApi = typeof import("@vladmandic/face-api");
type ModelProgress = { loaded: number; total: number; ready: boolean };

const LIVENESS_TIMEOUT_MS = 20_000;
const NO_FACE_TIMEOUT_MS = 20_000;
const DETECT_INTERVAL_MS = 100;
const SLOW_FRAME_MS = 200;
const SLOW_FRAME_AFTER = 15;

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

function center(points: LandmarkPoint[]): LandmarkPoint {
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
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

function faceScale(landmarks: LandmarksLike): number {
  const leftEye = center(landmarks.getLeftEye());
  const rightEye = center(landmarks.getRightEye());
  return distance(leftEye, rightEye);
}

function mouthRatio(landmarks: LandmarksLike): number {
  const scale = faceScale(landmarks);
  const mouth = landmarks.getMouth();
  if (scale === 0 || mouth.length < 7) return 1;
  return distance(mouth[0], mouth[6]) / scale;
}

function yawOffset(landmarks: LandmarksLike): number {
  const scale = faceScale(landmarks);
  const nose = landmarks.getNose();
  if (scale === 0 || nose.length === 0) return 0;
  const leftEye = center(landmarks.getLeftEye());
  const rightEye = center(landmarks.getRightEye());
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const tip = nose[Math.floor(nose.length / 2)];
  return (tip.x - eyeCenterX) / scale;
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
  const meshRef = useRef<HTMLCanvasElement | null>(null);
  const meshTargetRef = useRef<{ x: number; y: number }[] | null>(null);
  const meshRenderedRef = useRef<{ x: number; y: number }[] | null>(null);
  const meshAlphaRef = useRef(0);
  const greenRef = useRef(false);
  const descriptorRef = useRef(onDescriptor);
  const [status, setStatus] = useState<"loading" | "searching" | "blink" | "found" | "noblink" | "noface" | "error">(
    "loading",
  );
  const [cameraOn, setCameraOn] = useState(false);
  const [cueHint, setCueHint] = useState<"none" | "blink" | "smile" | "turn">("none");
  const [progress, setProgress] = useState<ModelProgress>({ loaded: 0, total: 3, ready: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    descriptorRef.current = onDescriptor;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    let blinkDone = false;
    let closedSeen = false;
    let smileFrames = 0;
    let turnFrames = 0;
    let livenessDeadline = 0;
    let noFaceSince = 0;
    let earBaseline = 0;
    let mouthBaseline = 1;
    let yawBaseline = 0;
    let rafMesh = 0;
    let lastCue: "none" | "blink" | "smile" | "turn" = "none";
    const unsubscribe = subscribeProgress(setProgress);

    function stop() {
      stopped = true;
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafMesh);
      unsubscribe();
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    }

    function drawMesh() {
      if (stopped) return;
      const canvas = meshRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
        const context = canvas.getContext("2d");
        if (context) {
          const target = meshTargetRef.current;
          meshAlphaRef.current += ((target ? 1 : 0) - meshAlphaRef.current) * 0.15;
          if (target) {
            let rendered = meshRenderedRef.current;
            if (!rendered || rendered.length !== target.length) {
              rendered = target.map((point) => ({ x: point.x, y: point.y }));
              meshRenderedRef.current = rendered;
            } else {
              for (let index = 0; index < rendered.length; index += 1) {
                rendered[index].x += (target[index].x - rendered[index].x) * 0.35;
                rendered[index].y += (target[index].y - rendered[index].y) * 0.35;
              }
            }
          }
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          context.clearRect(0, 0, width, height);
          const rendered = meshRenderedRef.current;
          const alpha = meshAlphaRef.current;
          if (rendered && alpha > 0.03 && video.videoWidth > 0) {
            const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
            const offsetX = (width - video.videoWidth * scale) / 2;
            const offsetY = (height - video.videoHeight * scale) / 2;
            const color = greenRef.current ? "52,211,153" : "34,211,238";
            for (const point of rendered) {
              const x = width - (offsetX + point.x * scale);
              const y = offsetY + point.y * scale;
              context.beginPath();
              context.arc(x, y, 4.4, 0, Math.PI * 2);
              context.fillStyle = `rgba(${color},${0.14 * alpha})`;
              context.fill();
              context.beginPath();
              context.arc(x, y, 1.8, 0, Math.PI * 2);
              context.fillStyle = `rgba(${color},${0.92 * alpha})`;
              context.fill();
            }
          }
        }
      }
      rafMesh = window.requestAnimationFrame(drawMesh);
    }

    async function start() {
      setStatus("loading");
      setCameraOn(false);
      blinkDone = false;
      closedSeen = false;
      smileFrames = 0;
      turnFrames = 0;
      livenessDeadline = 0;
      noFaceSince = 0;
      earBaseline = 0;
      mouthBaseline = 1;
      yawBaseline = 0;
      meshTargetRef.current = null;
      meshRenderedRef.current = null;
      meshAlphaRef.current = 0;
      greenRef.current = false;
      lastCue = "none";
      setCueHint("none");
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

        let options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 });
        try {
          await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();
        } catch {
          void 0;
        }
        if (stopped) return;
        setStatus("searching");

        let frameAvg = 0;
        let frameCount = 0;

        async function tick() {
          if (stopped) return;
          const videoEl = videoRef.current;
          if (!videoEl || videoEl.readyState < videoEl.HAVE_ENOUGH_DATA) {
            timer = window.setTimeout(tick, 120);
            return;
          }
          try {
            const frameStart = performance.now();
            const result = await faceapi.detectSingleFace(videoEl, options).withFaceLandmarks();
            const frameTime = performance.now() - frameStart;
            frameAvg = frameAvg === 0 ? frameTime : frameAvg * 0.75 + frameTime * 0.25;
            frameCount += 1;
            if (frameCount === SLOW_FRAME_AFTER && frameAvg > SLOW_FRAME_MS) {
              options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.4 });
            }
            if (stopped) return;
            if (!result?.landmarks) {
              meshTargetRef.current = null;
              if (livenessDeadline > 0 && Date.now() > livenessDeadline) {
                setStatus("noblink");
                return;
              }
              if (noFaceSince === 0) noFaceSince = Date.now();
              if (Date.now() - noFaceSince > NO_FACE_TIMEOUT_MS) {
                setStatus("noface");
                return;
              }
              timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
              return;
            }
            noFaceSince = 0;
            meshTargetRef.current = result.landmarks.positions as { x: number; y: number }[];
            if (livenessDeadline === 0) {
              livenessDeadline = Date.now() + LIVENESS_TIMEOUT_MS;
              setStatus("blink");
            }
            const landmarks = result.landmarks;
            const ear = eyeAspectRatio(landmarks);
            const ratio = mouthRatio(landmarks);
            const yaw = yawOffset(landmarks);
            let livenessPassed = false;
            if (earBaseline === 0) {
              if (ear > 0.18) {
                earBaseline = ear;
                mouthBaseline = ratio;
                yawBaseline = yaw;
              }
            } else {
              const blinkThreshold = Math.min(0.2, earBaseline * 0.72);
              if (ear < blinkThreshold) {
                closedSeen = true;
              } else if (closedSeen && ear > earBaseline * 0.85) {
                blinkDone = true;
              }
              if (ratio > mouthBaseline * 1.14) smileFrames += 1;
              else smileFrames = 0;
              if (Math.abs(yaw - yawBaseline) > 0.25) turnFrames += 1;
              else turnFrames = 0;
              livenessPassed = blinkDone || smileFrames >= 2 || turnFrames >= 2;
              if (!livenessPassed) {
                earBaseline += (ear - earBaseline) * 0.03;
                mouthBaseline += (ratio - mouthBaseline) * 0.03;
                yawBaseline += (yaw - yawBaseline) * 0.03;
              }
            }
            const cue =
              smileFrames > 0 ? "smile" : turnFrames > 0 ? "turn" : closedSeen && !blinkDone ? "blink" : "none";
            if (cue !== lastCue) {
              lastCue = cue;
              setCueHint(cue);
            }
            if (livenessPassed) {
              greenRef.current = true;
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
              }, 260);
              return;
            }
            if (Date.now() > livenessDeadline) {
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

    rafMesh = window.requestAnimationFrame(drawMesh);
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
              : status === "noface"
                ? t("schFaceNoFace")
                : t("schFacePermission");

  const isError = status === "error" || status === "noblink" || status === "noface";
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
        <canvas ref={meshRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        {[
          "left-3 top-3 rounded-tl-xl border-l-2 border-t-2",
          "right-3 top-3 rounded-tr-xl border-r-2 border-t-2",
          "left-3 bottom-3 rounded-bl-xl border-l-2 border-b-2",
          "right-3 bottom-3 rounded-br-xl border-r-2 border-b-2",
        ].map((position) => (
          <span
            key={position}
            className={`pointer-events-none absolute size-7 transition-colors duration-300 ${position} ${
              status === "found"
                ? "border-emerald-400"
                : status === "blink"
                  ? "animate-pulse border-amber-400/90"
                  : "border-white/70"
            }`}
          />
        ))}
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
          <div className="absolute inset-0 grid animate-fade-in place-items-center bg-slate-950/65 backdrop-blur-[2px]">
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
                        ? "flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100 transition-colors duration-300"
                        : "flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors duration-300"
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
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-10 flex animate-fade-in justify-center gap-1.5 px-10">
              {[
                {
                  key: "blink" as const,
                  label: t("schFaceCueBlink"),
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ),
                },
                {
                  key: "smile" as const,
                  label: t("schFaceCueSmile"),
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8.5 14a4.5 4.5 0 0 0 7 0" />
                      <path d="M9 9.5h.01M15 9.5h.01" />
                    </svg>
                  ),
                },
                {
                  key: "turn" as const,
                  label: t("schFaceCueTurn"),
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12h16" />
                      <path d="m7 9-3 3 3 3" />
                      <path d="m17 9 3 3-3 3" />
                    </svg>
                  ),
                },
              ].map((cue) => (
                <span
                  key={cue.key}
                  className={
                    cueHint === cue.key
                      ? "flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-lg transition-all duration-200"
                      : "flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75 backdrop-blur-sm transition-all duration-200"
                  }
                >
                  {cue.icon}
                  {cue.label}
                </span>
              ))}
            </div>
            <span className="pointer-events-none absolute inset-x-0 bottom-3.5 flex animate-fade-in items-center justify-center gap-1.5 text-center text-xs font-semibold text-amber-300">
              <svg className="animate-pulse" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {t("schFaceBlinkHint")}
            </span>
            <span className="pointer-events-none absolute inset-x-8 bottom-1 overflow-hidden rounded-full bg-white/15" style={{ height: 3 }}>
              <span className="block h-full w-full animate-countdown rounded-full bg-amber-300/90" />
            </span>
          </>
        ) : null}

        {status === "found" ? (
          <div className="absolute inset-0 grid animate-fade-in place-items-center bg-emerald-950/35">
            <span className="relative flex size-24 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/50" />
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/30" style={{ animationDelay: "420ms" }} />
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
