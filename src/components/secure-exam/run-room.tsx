"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { SYNC_INTERVAL_MS } from "@/modules/secure-exam/config";
import { severityOf, type SecureEventType } from "@/modules/secure-exam/events";
import type { RunState } from "@/modules/secure-exam/types";
import { EVENT_LABEL_KEY } from "@/components/secure-exam/labels";
import { FaceScan, ensureFaceModels } from "@/components/face/face-scan";
import { useFaceGuard } from "@/components/secure-exam/use-face-guard";
import { useInputGuard } from "@/components/secure-exam/use-input-guard";
import {
  QUESTION_TYPE_KEY,
  QUESTION_TYPE_SOFT,
  QUESTION_TYPE_TONE,
  type AnswerValue,
  type QuestionPublic,
  type QuizAnswers,
} from "@/components/quiz/shared";

type QueuedEvent = {
  type: SecureEventType;
  meta?: Record<string, string | number | boolean>;
};

export type RunSettings = {
  requireFullscreen: boolean;
  blockCopy: boolean;
  webcamEnabled: boolean;
  maxWarnings: number;
  limitAction: "WARN" | "TERMINATE";
  faceEnrolled: boolean;
};

function formatClock(seconds: number): string {
  const hh = Math.floor(seconds / 3600);
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

async function detectScreens(): Promise<number | null> {
  const extended = (window.screen as unknown as { isExtended?: boolean }).isExtended;
  if (typeof extended === "boolean") return extended ? 2 : 1;
  const getter = (
    window as unknown as { getScreenDetails?: () => Promise<{ screens?: unknown[] }> }
  ).getScreenDetails;
  if (typeof getter === "function") {
    try {
      const details = await getter.call(window);
      return details.screens ? details.screens.length : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function RunRoom({
  runId,
  quizId,
  title,
  courseTitle,
  questions,
  endsAt: initialEndsAt,
  initialAnswers,
  initialWarnings,
  settings,
}: {
  runId: string;
  quizId: string;
  title: string;
  courseTitle: string;
  questions: QuestionPublic[];
  endsAt: string | null;
  initialAnswers: QuizAnswers;
  initialWarnings: number;
  settings: RunSettings;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [phase, setPhase] = useState<"gate" | "running" | "terminated" | "finished">("gate");
  const [answers, setAnswers] = useState<QuizAnswers>(initialAnswers);
  const [warnings, setWarnings] = useState(initialWarnings);
  const [localDeadlineMs, setLocalDeadlineMs] = useState<number | null>(
    initialEndsAt ? Date.parse(initialEndsAt) : null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [multiMonitor, setMultiMonitor] = useState(false);
  const [duplicateTab, setDuplicateTab] = useState(false);
  const [faceAlert, setFaceAlert] = useState(false);
  const [faceStatus, setFaceStatus] = useState<"off" | "ok" | "away" | "turned" | "multi">("off");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [toast, setToast] = useState<{ label: string; tone: "amber" | "rose" } | null>(null);
  const [faceStage, setFaceStage] = useState<"idle" | "scan" | "verify" | "mismatch">("idle");
  const [faceChip, setFaceChip] = useState<"monitoring" | "absent" | "multi" | null>(null);

  const answersRef = useRef<QuizAnswers>(initialAnswers);
  const eventsRef = useRef<QueuedEvent[]>([]);
  const screenCountRef = useRef<number | null>(null);
  const multiRaisedRef = useRef(false);
  const blurredRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const dupRaisedRef = useRef(false);
  const darkCountRef = useRef(0);
  const faceCooldownRef = useRef(0);
  const faceMissingStreakRef = useRef(0);
  const phaseRef = useRef(phase);
  const finishedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const faceDescriptorRef = useRef<number[] | null>(null);
  const lastUrgentSyncRef = useRef(0);
  const syncRef = useRef<(() => Promise<unknown>) | null>(null);
  const clientIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "web",
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const showToast = useCallback(
    (type: SecureEventType) => {
      const severity = severityOf(type);
      if (severity === "INFO") return;
      setToast({ label: t(EVENT_LABEL_KEY[type]), tone: severity === "CRITICAL" ? "rose" : "amber" });
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
    },
    [t],
  );

  const pushEvent = useCallback(
    (type: SecureEventType, meta?: Record<string, string | number | boolean>) => {
      eventsRef.current.push({ type, meta });
      if (phaseRef.current !== "running") return;
      showToast(type);
      if (severityOf(type) !== "INFO") {
        const now = Date.now();
        if (now - lastUrgentSyncRef.current > 2000) {
          lastUrgentSyncRef.current = now;
          window.setTimeout(() => {
            void syncRef.current?.();
          }, 400);
        }
      }
    },
    [showToast],
  );

  useInputGuard({ active: phase === "running", onEvent: pushEvent });

  useFaceGuard({
    videoRef,
    active: phase === "running" && cameraReady && settings.faceEnrolled,
    onEvent: pushEvent,
    onDescriptor: (descriptor) => {
      faceDescriptorRef.current = descriptor;
    },
    onStatus: setFaceChip,
  });

  const sync = useCallback(
    async (options?: { submit?: boolean }) => {
      const screens = await detectScreens();
      if (screens !== null) {
        screenCountRef.current = screens;
        if (screens > 1 && !multiRaisedRef.current) {
          multiRaisedRef.current = true;
          setMultiMonitor(true);
          eventsRef.current.push({ type: "MULTI_MONITOR", meta: { screens } });
        }
      }
      const payload: Record<string, unknown> = {
        client: {
          clientId: clientIdRef.current,
          version: "web-1",
          screens: screenCountRef.current ?? undefined,
          fullscreen: Boolean(document.fullscreenElement),
          webcam: streamRef.current !== null,
        },
        events: eventsRef.current.splice(0, eventsRef.current.length),
        answers: answersRef.current,
      };
      if (faceDescriptorRef.current) {
        payload.face = { descriptor: faceDescriptorRef.current };
        faceDescriptorRef.current = null;
      }
      if (options?.submit) payload.submit = true;
      const result = await apiFetch<RunState>(
        `/api/secure-exams/runs/${runId}/sync`,
        "POST",
        payload,
        t("commonNetworkError"),
      );
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      const state = result.data;
      setError(null);
      setWarnings(state.warnings);
      if (state.face?.check === "mismatch" && phaseRef.current === "running") {
        setToast({ label: t("secEventFACE_MISMATCH"), tone: "rose" });
      }
      if (state.endsAt) {
        setLocalDeadlineMs(Date.parse(state.endsAt) + (Date.now() - Date.parse(state.serverNow)));
      }
      if (state.status === "TERMINATED") {
        finishedRef.current = true;
        setPhase("terminated");
      } else if (state.finished && !options?.submit) {
        finishedRef.current = true;
        setPhase("finished");
      }
      return state;
    },
    [runId, t],
  );

  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  const enterRoom = useCallback(() => {
    setPhase("running");
    if (settings.requireFullscreen) eventsRef.current.push({ type: "FULLSCREEN_ENTER" });
    if (settings.webcamEnabled) eventsRef.current.push({ type: "WEBCAM_ON" });
    void sync();
  }, [settings.requireFullscreen, settings.webcamEnabled, sync]);

  const finish = useCallback(
    async () => {
      if (finishedRef.current) return;
      setSubmitting(true);
      setError(null);
      const state = await sync({ submit: true });
      if (!state) {
        setSubmitting(false);
        return;
      }
      finishedRef.current = true;
      setSubmitting(false);
      setConfirmOpen(false);
      setPhase("finished");
    },
    [sync],
  );

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const remaining =
    localDeadlineMs === null
      ? null
      : Math.max(0, Math.floor((localDeadlineMs - now) / 1000));

  useEffect(() => {
    if (phase === "running" && remaining === 0 && !finishedRef.current) {
      void finish();
    }
  }, [phase, remaining, finish]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [phase, sync]);

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (phaseRef.current === "running") {
        eventsRef.current.push({ type: active ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT" });
        if (!active) showToast("FULLSCREEN_EXIT");
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [showToast]);

  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        pushEvent("TAB_HIDDEN");
      } else {
        pushEvent("TAB_VISIBLE");
        if (wasHiddenRef.current) {
          wasHiddenRef.current = false;
          showToast("TAB_HIDDEN");
        }
      }
    };
    const onBlur = () => {
      if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null;
        if (document.visibilityState === "visible") {
          pushEvent("WINDOW_BLUR");
          blurredRef.current = true;
        }
      }, 150);
    };
    const onFocus = () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      pushEvent("WINDOW_FOCUS");
      if (blurredRef.current) {
        blurredRef.current = false;
        showToast("WINDOW_BLUR");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [phase, pushEvent, showToast]);

  useEffect(() => {
    if (phase !== "running" || !settings.blockCopy) return;
    const handler = (type: SecureEventType) => (event: Event) => {
      event.preventDefault();
      pushEvent(type);
    };
    const onCopy = handler("COPY");
    const onCut = handler("CUT");
    const onPaste = handler("PASTE");
    const onContext = handler("CONTEXT_MENU");
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContext, true);
    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContext, true);
    };
  }, [phase, settings.blockCopy, pushEvent]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = event.ctrlKey || event.metaKey;
      const key = event.key.toUpperCase();
      if (event.key === "PrintScreen") {
        event.preventDefault();
        pushEvent("PRINT_ATTEMPT");
        return;
      }
      if (event.key === "F12") {
        event.preventDefault();
        pushEvent("KEY_BLOCKED", { key: event.key });
        return;
      }
      const shiftCombo = combo && event.shiftKey && ["I", "J", "C", "K", "U"].includes(key);
      const macCombo = event.metaKey && event.altKey && ["I", "J", "C", "U"].includes(key);
      if (shiftCombo || macCombo) {
        event.preventDefault();
        pushEvent("KEY_BLOCKED", { key: event.key });
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [phase, pushEvent]);

  useEffect(() => {
    if (phase !== "running") return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraReady || !video || !stream) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => void 0);
  }, [cameraReady, phase]);

  useEffect(() => {
    const stream = streamRef.current;
    if (!cameraReady || !stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const onEnded = () => pushEvent("WEBCAM_OFF");
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [cameraReady, pushEvent]);

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`secure-exam-room-${runId}`);
    const clientId = clientIdRef.current;
    const flagDuplicate = () => {
      if (dupRaisedRef.current) return;
      dupRaisedRef.current = true;
      setDuplicateTab(true);
      eventsRef.current.push({ type: "DUPLICATE_TAB" });
      showToast("DUPLICATE_TAB");
    };
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as { clientId?: string; type?: string } | null;
      if (!data || typeof data.clientId !== "string") return;
      if (data.clientId === clientId) return;
      flagDuplicate();
      if (data.type === "hello") {
        channel.postMessage({ clientId, type: "here" });
      }
    };
    channel.postMessage({ clientId, type: "hello" });
    const heartbeat = window.setInterval(
      () => channel.postMessage({ clientId, type: "beat" }),
      5000,
    );
    return () => {
      window.clearInterval(heartbeat);
      channel.close();
    };
  }, [runId, showToast]);

  useEffect(() => {
    if (phase !== "running") return;
    const onAux = (event: MouseEvent) => {
      if (event.button !== 1) return;
      event.preventDefault();
      pushEvent("AUX_CLICK");
    };
    const onDrag = (event: Event) => {
      event.preventDefault();
      pushEvent("DRAG_ATTEMPT");
    };
    const onMouseOut = (event: MouseEvent) => {
      if (event.relatedTarget === null) pushEvent("MOUSE_LEFT");
    };
    document.addEventListener("auxclick", onAux, true);
    document.addEventListener("dragstart", onDrag, true);
    document.addEventListener("drop", onDrag, true);
    document.addEventListener("mouseout", onMouseOut, true);
    return () => {
      document.removeEventListener("auxclick", onAux, true);
      document.removeEventListener("dragstart", onDrag, true);
      document.removeEventListener("drop", onDrag, true);
      document.removeEventListener("mouseout", onMouseOut, true);
    };
  }, [phase, pushEvent]);

  useEffect(() => {
    if (!cameraReady || phase !== "running") return;
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const context = canvas.getContext("2d");
      if (!video || !context || video.readyState < 2) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      for (let index = 0; index < frame.data.length; index += 4) {
        sum += frame.data[index] + frame.data[index + 1] + frame.data[index + 2];
      }
      const average = sum / (frame.data.length / 4) / 3;
      if (average < 12) {
        darkCountRef.current += 1;
      } else {
        darkCountRef.current = 0;
      }
      if (darkCountRef.current >= 3) {
        darkCountRef.current = 0;
        pushEvent("CAMERA_BLOCKED");
      }
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [cameraReady, phase, pushEvent]);

  useEffect(() => {
    if (!cameraReady || phase !== "running") return;
    const sendSnapshot = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.55);
      if (image.length > 250_000) return;
      eventsRef.current.push({ type: "SNAPSHOT" });
      await apiFetch(
        `/api/secure-exams/runs/${runId}/snapshot`,
        "POST",
        { image },
        t("commonNetworkError"),
      );
    };
    const first = window.setTimeout(() => void sendSnapshot(), 8_000);
    const timer = window.setInterval(() => void sendSnapshot(), 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [cameraReady, phase, runId, t]);

  useEffect(() => {
    if (!cameraReady || phase !== "running") return;
    let cancelled = false;
    let interval: number | null = null;
    const startMonitoring = async () => {
      try {
        const faceapi = await ensureFaceModels();
        if (cancelled) return;
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
        interval = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          const now = Date.now();
          try {
            const detections = await faceapi
              .detectAllFaces(video, options)
              .withFaceLandmarks();
            if (cancelled) return;
            if (detections.length === 0) {
              faceMissingStreakRef.current += 1;
              setFaceAlert(true);
              setFaceStatus("away");
              if (
                faceMissingStreakRef.current >= 2 &&
                now - faceCooldownRef.current > 12_000
              ) {
                faceCooldownRef.current = now;
                faceMissingStreakRef.current = 0;
                pushEvent("FACE_MISSING");
              }
              return;
            }
            faceMissingStreakRef.current = 0;
            if (detections.length > 1) {
              setFaceAlert(true);
              setFaceStatus("multi");
              if (now - faceCooldownRef.current > 12_000) {
                faceCooldownRef.current = now;
                pushEvent("MULTIPLE_FACES", { count: detections.length });
              }
              return;
            }
            const landmarks = detections[0].landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            const nose = landmarks.getNose();
            const leftCenter = leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length;
            const rightCenter = rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length;
            const eyeDistance = Math.abs(rightCenter - leftCenter) || 1;
            const noseTip = nose[nose.length - 1];
            const eyeMid = (leftCenter + rightCenter) / 2;
            const yaw = Math.abs(noseTip.x - eyeMid) / eyeDistance;
            const dLeft = Math.abs(noseTip.x - leftCenter);
            const dRight = Math.abs(noseTip.x - rightCenter);
            const asym = Math.abs(dLeft - dRight) / (dLeft + dRight || 1);
            if (yaw > 0.18 || asym > 0.28) {
              setFaceAlert(true);
              setFaceStatus("turned");
              if (now - faceCooldownRef.current > 12_000) {
                faceCooldownRef.current = now;
                pushEvent("FACE_TURNED", {
                  yaw: Number(yaw.toFixed(2)),
                  asym: Number(asym.toFixed(2)),
                });
              }
              return;
            }
            setFaceAlert(false);
            setFaceStatus("ok");
          } catch {
            void 0;
          }
        }, 3000);
      } catch {
        void 0;
      }
    };
    void startMonitoring();
    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
    };
  }, [cameraReady, phase, pushEvent]);

  async function start() {
    setError(null);
    setCameraError(false);
    if (settings.webcamEnabled && settings.faceEnrolled) {
      if (settings.requireFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          setError(t("secGateFullscreenText"));
          return;
        }
      }
      setFaceStage("scan");
      return;
    }
    if (settings.webcamEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setCameraReady(true);
      } catch {
        setCameraError(true);
        return;
      }
    }
    if (settings.requireFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setError(t("secGateFullscreenText"));
        return;
      }
    }
    enterRoom();
  }

  async function onFaceDescriptor(descriptor: number[]) {
    faceDescriptorRef.current = descriptor;
    setFaceStage("verify");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraReady(true);
    } catch {
      setCameraError(true);
      setFaceStage("idle");
      return;
    }
    const state = await sync();
    if (!state) {
      setFaceStage("idle");
      return;
    }
    if (state.face?.check === "mismatch") {
      setFaceStage("mismatch");
      return;
    }
    setFaceStage("idle");
    enterRoom();
  }

  function setValue(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiple(questionId: string, index: number) {
    const current = answers[questionId];
    const selected = Array.isArray(current)
      ? current.filter((item): item is number => typeof item === "number")
      : [];
    const next = selected.includes(index)
      ? selected.filter((item) => item !== index)
      : [...selected, index].sort((a, b) => a - b);
    setValue(questionId, next);
  }

  function isChecked(questionId: string, index: number): boolean {
    const current = answers[questionId];
    return Array.isArray(current) && current.some((item) => item === index);
  }

  function textValue(questionId: string): string {
    const current = answers[questionId];
    return typeof current === "string" ? current : "";
  }

  const answeredCount = questions.filter((question) => answers[question.id] !== undefined).length;
  const unanswered = questions.length - answeredCount;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const critical = remaining !== null && remaining <= 60;
  const fullscreenLost = phase === "running" && settings.requireFullscreen && !fullscreenActive;

  if (phase === "gate") {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            {t("secModeChip")}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-brand-950">
            {t("secGateTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("secGateText")}</p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
            {settings.requireFullscreen ? (
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand-600" />
                Fullscreen
              </li>
            ) : null}
            {settings.blockCopy ? (
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand-600" />
                {t("secFieldBlockCopy")}
              </li>
            ) : null}
            {settings.webcamEnabled ? (
              <>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-brand-600" />
                  {t("secGateCameraTitle")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-brand-600" />
                  {t("secFaceHint")}
                </li>
              </>
            ) : null}
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-brand-600" />
              {t("secWarningLimit", { max: settings.maxWarnings })}
            </li>
          </ul>
          {settings.webcamEnabled && !settings.faceEnrolled ? (
            <p className="mt-3 text-xs text-slate-500">{t("secFaceGateNotEnrolled")}</p>
          ) : null}
          {settings.webcamEnabled && settings.faceEnrolled && faceStage === "scan" ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-slate-800">{t("secFaceGateTitle")}</p>
              <p className="text-sm text-slate-600">{t("secFaceGateText")}</p>
              <FaceScan
                onDescriptor={(descriptor) => void onFaceDescriptor(descriptor)}
                onCancel={() => setFaceStage("idle")}
              />
            </div>
          ) : null}
          {settings.webcamEnabled && settings.faceEnrolled && faceStage === "verify" ? (
            <p className="mt-5 text-sm text-slate-600">{t("secFaceGateVerify")}</p>
          ) : null}
          {settings.webcamEnabled && settings.faceEnrolled && faceStage === "mismatch" ? (
            <div className="mt-5 space-y-3 rounded-xl bg-rose-50 px-3.5 py-3">
              <p className="text-sm text-rose-700">{t("secFaceGateMismatch")}</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setFaceStage("scan")}
              >
                {t("schFaceRetry")}
              </Button>
            </div>
          ) : null}
          {settings.webcamEnabled && cameraError ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              {t("secGateCameraError")}
            </p>
          ) : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
          {settings.webcamEnabled && settings.faceEnrolled && faceStage !== "idle" ? null : (
            <Button size="lg" className="mt-5 w-full py-3 text-base!" onClick={() => void start()}>
              {t("secGateStart")}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "terminated") {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-6 text-center">
          <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 9l6 6M15 9l-6 6" />
            </svg>
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            {t("secTerminatedTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {warnings >= settings.maxWarnings ? t("secTerminatedByLimit") : t("secTerminatedText")}
          </p>
          <Button className="mt-5" onClick={() => router.push(`/quizzes/${quizId}/results`)}>
            {t("secResultsLink")}
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "finished") {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-6 text-center">
          <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">
            {t("secFinishedTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t("secFinishedText")}</p>
          <Button className="mt-5" onClick={() => router.push(`/quizzes/${quizId}/results`)}>
            {t("secResultsLink")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {duplicateTab ? (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="13" height="13" rx="2" />
            <path d="M9 21h11a2 2 0 0 0 2-2V9" />
          </svg>
          {t("secDuplicateTab")}
        </div>
      ) : null}

      {multiMonitor ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          {t("secMultiMonitor")}
        </div>
      ) : null}

      {toast ? (
        <div
          role={toast.tone === "rose" ? "alert" : "status"}
          className={cn(
            "fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg",
            toast.tone === "rose" ? "bg-rose-600 text-white" : "bg-amber-500 text-white",
          )}
        >
          {toast.label}
        </div>
      ) : null}

      <header className="sticky top-16 z-30 mb-6 rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3.5 shadow-card backdrop-blur md:top-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-brand-900">{title}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{courseTitle}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    progress === 100 ? "bg-emerald-500" : "bg-brand-600",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {t("secMarkedCount", { answered: answeredCount, total: questions.length })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge tone={warnings > 0 ? (warnings >= settings.maxWarnings ? "rose" : "amber") : "slate"}>
              {t("secWarningsChip", { count: warnings, max: settings.maxWarnings })}
            </Badge>
            {remaining !== null ? (
              <p
                className={cn(
                  "font-mono text-2xl font-semibold tabular-nums sm:text-3xl",
                  critical ? "animate-pulse text-rose-600" : "text-brand-900",
                )}
              >
                {formatClock(remaining)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">{t("secUnlimitedTime")}</p>
            )}
          </div>
        </div>
      </header>

      <div className={cn("space-y-5", settings.blockCopy && "select-none")}>
        {questions.map((question, index) => (
          <section
            key={question.id}
            data-index={index}
            className="scroll-mt-32 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-xl text-sm font-bold",
                    QUESTION_TYPE_SOFT[question.type],
                  )}
                >
                  {index + 1}
                </span>
                <Badge tone={QUESTION_TYPE_TONE[question.type]}>
                  {t(QUESTION_TYPE_KEY[question.type])}
                </Badge>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-300/25 px-2.5 py-1 text-xs font-semibold text-gold-800">
                {t("secPointsShort", { points: question.points })}
              </span>
            </div>
            <p className="mt-3.5 text-base font-medium leading-relaxed text-slate-900">
              {question.text}
            </p>

            {question.type === "SINGLE" || question.type === "MULTIPLE" ? (
              <div className="mt-4 space-y-2.5">
                {question.options.map((option, optionIndex) => {
                  const selected =
                    question.type === "SINGLE"
                      ? answers[question.id] === optionIndex
                      : isChecked(question.id, optionIndex);
                  return (
                    <label
                      key={optionIndex}
                      className={cn(
                        "flex cursor-pointer items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-base transition-[background-color,border-color,color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/30 sm:px-5 sm:py-4",
                        selected
                          ? "border-brand-500 bg-brand-50/70 font-medium text-brand-950 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <input
                        type={question.type === "SINGLE" ? "radio" : "checkbox"}
                        name={`question-${question.id}`}
                        checked={selected}
                        onChange={() =>
                          question.type === "SINGLE"
                            ? setValue(question.id, optionIndex)
                            : toggleMultiple(question.id, optionIndex)
                        }
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "inline-flex size-6 shrink-0 items-center justify-center border transition-colors duration-150",
                          question.type === "SINGLE" ? "rounded-full" : "rounded-lg",
                          selected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        {selected ? <CheckIcon /> : null}
                      </span>
                      <span className="flex-1">{option}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <Textarea
                rows={5}
                placeholder={t("secTextAnswerPlaceholder")}
                value={textValue(question.id)}
                onChange={(event) => setValue(question.id, event.target.value)}
                className="mt-4"
              />
            )}
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-lift backdrop-blur">
        {error ? <p className="mb-2 px-1 text-sm text-rose-600">{error}</p> : null}
        <p className="mb-2 px-1 text-xs text-slate-500">
          {unanswered > 0 ? t("secUnanswered", { count: unanswered }) : t("secAllAnswered")}
        </p>
        <Button
          size="lg"
          className="w-full py-3 text-base!"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
        >
          {submitting ? t("secSubmitting") : t("secSubmit")}
        </Button>
      </div>

      {cameraReady ? (
        <div
          className={cn(
            "fixed bottom-24 right-4 z-40 overflow-hidden rounded-xl border bg-black shadow-lg transition-[border-color,box-shadow] duration-300",
            faceAlert
              ? "border-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.35)]"
              : "border-slate-200",
          )}
        >
          <video ref={videoRef} autoPlay muted playsInline className="h-28 w-40 object-cover" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            <span
              className={cn(
                "size-1.5 rounded-full",
                faceStatus === "ok"
                  ? "bg-emerald-400"
                  : faceStatus === "off"
                    ? "animate-pulse bg-rose-500"
                    : "animate-pulse bg-rose-500",
              )}
            />
            {faceStatus === "ok"
              ? t("secFaceOk")
              : faceStatus === "away"
                ? t("secFaceAway")
                : faceStatus === "turned"
                  ? t("secFaceTurned")
                  : faceStatus === "multi"
                    ? t("secFaceMulti")
                    : t("secCamera")}
          </span>
          {settings.faceEnrolled && faceChip ? (
            <span
              className={cn(
                "absolute bottom-0 left-0 right-0 px-2 py-1 text-center text-[10px] font-medium text-white",
                faceChip === "monitoring" ? "bg-emerald-600/90" : "bg-rose-600/90",
              )}
            >
              {faceChip === "monitoring"
                ? t("secFaceChipMonitoring")
                : faceChip === "absent"
                  ? t("secFaceChipAbsent")
                  : t("secFaceChipMulti")}
            </span>
          ) : null}
        </div>
      ) : null}

      {fullscreenLost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lift">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {t("secGateFullscreenTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">{t("secGateFullscreenText")}</p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                void document.documentElement.requestFullscreen().catch(() => setError(t("secGateFullscreenText")));
              }}
            >
              {t("secGateFullscreenButton")}
            </Button>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-lift">
            <p className="text-base font-semibold tracking-tight text-slate-900">
              {t("secSubmitConfirmTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t("secSubmitConfirmText", { answered: answeredCount, total: questions.length })}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                {t("commonCancel")}
              </Button>
              <Button onClick={() => void finish()} disabled={submitting}>
                {submitting ? t("secSubmitting") : t("secSubmit")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
