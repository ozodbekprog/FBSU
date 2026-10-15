"use client";

import { useEffect, useRef, type RefObject } from "react";
import { ensureFaceModels } from "@/components/face/face-scan";
import { FaceGuardTracker, faceMetrics } from "@/modules/secure-exam/face-guard";
import type { SecureEventType } from "@/modules/secure-exam/events";

const TICK_INTERVAL_MS = 500;
const DESCRIPTOR_EVERY_TICKS = 20;
const DESCRIPTOR_EVERY_MS = 30_000;
const MAX_CONSECUTIVE_ERRORS = 5;

export function useFaceGuard(options: {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onEvent: (type: SecureEventType, meta?: Record<string, string | number | boolean>) => void;
  onDescriptor: (descriptor: number[]) => void;
  onStatus: (status: "monitoring" | "absent" | "multi") => void;
}): void {
  const { videoRef, active } = options;
  const trackerRef = useRef<FaceGuardTracker | null>(null);
  if (trackerRef.current === null) trackerRef.current = new FaceGuardTracker();
  const onEventRef = useRef(options.onEvent);
  const onDescriptorRef = useRef(options.onDescriptor);
  const onStatusRef = useRef(options.onStatus);

  useEffect(() => {
    onEventRef.current = options.onEvent;
    onDescriptorRef.current = options.onDescriptor;
    onStatusRef.current = options.onStatus;
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer = 0;
    let errors = 0;
    let ticks = 0;
    let noVideoSkips = 0;
    let noVideoReported = false;
    let wasHidden = false;
    let lastDescriptorAt = Date.now();

    async function run() {
      const faceapi = await ensureFaceModels();
      if (cancelled) return;
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 160,
        scoreThreshold: 0.4,
      });
      onEventRef.current("CLIENT_INFO", { guard: "face", state: "active" });

      async function tick() {
        if (cancelled) return;
        const video = videoRef.current;
        const videoNotReady = !video || video.readyState < 2 || video.videoWidth === 0;
        if (videoNotReady || document.hidden) {
          if (document.hidden) {
            if (!wasHidden) {
              wasHidden = true;
              trackerRef.current?.reset();
            }
          } else {
            wasHidden = false;
          }
          if (videoNotReady) {
            noVideoSkips += 1;
            if (noVideoSkips >= 10 && !noVideoReported) {
              noVideoReported = true;
              onEventRef.current("CLIENT_INFO", { guard: "face", state: "no-video" });
            }
          }
          timer = window.setTimeout(() => void tick(), TICK_INTERVAL_MS);
          return;
        }
        if (!video) return;
        wasHidden = false;
        noVideoSkips = 0;
        noVideoReported = false;
        try {
          const results = await faceapi.detectAllFaces(video, detectorOptions).withFaceLandmarks();
          if (cancelled) return;
          const tracker = trackerRef.current;
          if (!tracker) return;
          const metrics = results.map((result) => faceMetrics(result.landmarks));
          const events = tracker.tick({ metrics, ts: Date.now() });
          for (const event of events) onEventRef.current(event.type, event.meta);
          onStatusRef.current(tracker.status());

          ticks += 1;
          const now = Date.now();
          const descriptorDue =
            ticks % DESCRIPTOR_EVERY_TICKS === 0 || now - lastDescriptorAt >= DESCRIPTOR_EVERY_MS;
          if (results.length === 1 && descriptorDue) {
            lastDescriptorAt = now;
            const full = await faceapi
              .detectSingleFace(video, detectorOptions)
              .withFaceLandmarks()
              .withFaceDescriptor();
            if (!cancelled && full?.descriptor) {
              onDescriptorRef.current(Array.from(full.descriptor));
            }
          }
          errors = 0;
        } catch {
          errors += 1;
          if (errors >= MAX_CONSECUTIVE_ERRORS) {
            onEventRef.current("CLIENT_INFO", { guard: "face", state: "stopped" });
            return;
          }
        }
        timer = window.setTimeout(() => void tick(), TICK_INTERVAL_MS);
      }

      void tick();
    }

    void run().catch(() => void 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, videoRef]);
}
