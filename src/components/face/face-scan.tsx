"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

export function FaceScan({
  onDescriptor,
  onCancel,
}: {
  onDescriptor: (descriptor: number[]) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"loading" | "searching" | "found" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;

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
            if (result?.descriptor && !stopped) {
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
            }
          } catch {
            void 0;
          }
        }, 700);
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
        : status === "found"
          ? t("schFaceFound")
          : t("schFacePermission");

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
        <span className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-white/70" />
        {status === "found" ? (
          <span className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-emerald-400" />
        ) : null}
      </div>
      <p
        className={
          status === "error"
            ? "rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700"
            : "text-center text-sm font-medium text-slate-600"
        }
      >
        {statusText}
      </p>
      <p className="text-center text-xs text-slate-500">{t("schFaceScoreHint")}</p>
      {status === "error" ? (
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
