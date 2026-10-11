"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/LocaleProvider";
import type { useCallSignaling } from "./useCallSignaling";

type Signaling = ReturnType<typeof useCallSignaling>;

/**
 * To'liq ekranli video qo'ng'iroq oynasi.
 *
 * Telegram'ga o'xshab: katak video yuqorida, o'z videomiz burchakda
 * mayda. Mobil ekranda qul qurilmasi portraitga moslashadi.
 *
 * Oyna `body` ga portal qilinadi — aks holda u `Card` ning ichida qolib,
 * ilova darajasidagi boshqa oynalar (yordamchi, bildirishnoma — `z-50`)
 * ustida qolardi va foydalanuvchi tugmalarni bosolmagan.
 */
export function VideoCallOverlay({ call }: { call: Signaling }) {
  const { t } = useI18n();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  // Ovoz chiqishi (dinamik / quloqchin) — `setSinkId` qo'llanadigan
  // element: video rejimda `video`, audio rejimda maxsus `audio`.
  const sinkElRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [outputs, setOutputs] = useState<{ deviceId: string; label: string }[]>([]);
  const [currentOutput, setCurrentOutput] = useState("");

  const active = call.phase !== "idle" && call.phase !== "ended";
  const connected = call.phase === "active";

  const supportsSink =
    typeof document !== "undefined" &&
    typeof (document.createElement("audio") as HTMLAudioElement & { setSinkId?: unknown }).setSinkId === "function";

  // Audio chiqish qurilmalari — ruxsat berilgach (videoda) label'lar keladi.
  useEffect(() => {
    if (!active || !navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        setOutputs(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${t("callAudioOutput")} ${i + 1}` })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, call.remoteStream, call.localStream, t]);

  async function pickOutput(deviceId: string) {
    setCurrentOutput(deviceId);
    setDeviceOpen(false);
    const el = sinkElRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (el && typeof el.setSinkId === "function") {
      try {
        await el.setSinkId(deviceId);
      } catch {
        // ba'zi brauzerlar qo'llab-quvvatlamaydi — e'tiborsiz
      }
    }
  }

  // Callback ref — oddiy `useEffect` ishlatilsa, oqim element mount
  // bo'lishidan OLDIN kelganda `ref.current` null bo'lardi va
  // `srcObject` biriktirilmas edi (video qora qolardi). Callback ref
  // ikkala holatni ham qamrab oladi.
  const attachLocal = useCallback(
    (node: HTMLVideoElement | null) => {
      localRef.current = node;
      if (node && call.localStream) node.srcObject = call.localStream;
    },
    [call.localStream],
  );

  const attachRemote = useCallback(
    (node: HTMLVideoElement | null) => {
      remoteRef.current = node;
      if (node) sinkElRef.current = node;
      if (node && call.remoteStream) {
        node.srcObject = call.remoteStream;
        void node.play().catch(() => {});
      }
    },
    [call.remoteStream],
  );

  if (!active && !call.error) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("callTitle")}
      data-call-overlay=""
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-slate-900 text-white",
        // mobil brauzerlar uchun xavfsiz zona
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {/* qarshi tomon video */}
      <div className="relative min-h-0 flex-1 bg-slate-900">
        <video
          ref={attachRemote}
          autoPlay
          playsInline
          className={cn("size-full object-cover", (!call.remoteStream || !call.isVideo) && "hidden")}
        />

        {/* Audio qo'ng'iroqda qarshi tomon ovozi shu element orqali
            chiqadi — dinamik/quloqchin tanlovi ham shu yerga qo'llanadi. */}
        {!call.isVideo && call.remoteStream ? (
          <audio
            ref={(node) => {
              sinkElRef.current = node;
              if (node && node.srcObject !== call.remoteStream) {
                node.srcObject = call.remoteStream;
                void node.play().catch(() => {});
              }
            }}
            autoPlay
            className="hidden"
            data-remote-audio=""
          />
        ) : null}

        {!call.isVideo || !call.remoteStream ? (
          <div className="flex size-full flex-col items-center justify-center gap-5 px-6 text-center">
            {call.peer ? (
              <Avatar name={call.peer.name} src={call.peer.avatarUrl} size={104} />
            ) : (
              <div className="size-24 animate-pulse rounded-full bg-slate-800" />
            )}
            <div>
              <p className="text-xl font-semibold">{call.peer?.name ?? t("callConnecting")}</p>
              <p className="mt-1.5 text-sm text-slate-400">
                {call.phase === "ringing-in" && !call.isVideo && t("callIncomingAudio")}
                {call.phase === "ringing-in" && call.isVideo && t("callIncoming")}
                {call.phase === "ringing-out" && !call.isVideo && t("callRingingAudio")}
                {call.phase === "ringing-out" && call.isVideo && t("callRinging")}
                {call.phase === "connecting" && t("callConnecting")}
                {connected && !call.isVideo && t("callConnectedAudio")}
                {connected && call.isVideo && t("callConnected")}
              </p>
            </div>
            {call.phase === "ringing-in" ? (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={call.decline}
                  className="inline-flex size-14 items-center justify-center rounded-full bg-rose-600 transition-colors hover:bg-rose-500"
                  aria-label={t("callDecline")}
                >
                  <PhoneOffIcon />
                </button>
                <button
                  type="button"
                  onClick={call.accept}
                  data-call-accept=""
                  className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-600 transition-colors hover:bg-emerald-500"
                  aria-label={t("callAccept")}
                >
                  <PhoneIcon />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* o'z videomiz — burchakda (faqat video qo'ng'iroqda) */}
        {call.isVideo && call.localStream ? (
          <div className="absolute right-3 bottom-3 w-28 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 shadow-lg sm:w-40">
            <video
              ref={attachLocal}
              autoPlay
              playsInline
              muted
              // o'z videomiz ko'zgu bo'lmasligi kerak
              className="aspect-3/4 w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!call.camOn ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <VideoOffIcon className="size-6 text-slate-400" />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* yuqorida holat yorlig'i */}
        {call.phase === "ringing-out" || call.phase === "connecting" ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
            {call.phase === "ringing-out" ? t("callRinging") : t("callConnecting")}
          </div>
        ) : null}

        {call.error ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-500/90 px-3.5 py-1.5 text-xs font-medium">
            {call.error}
          </div>
        ) : null}
      </div>

      {/* boshqaruvlar — doim qora fonda (telefonda tugmalar ko'rinishi uchun) */}
      <div className="shrink-0 border-t border-white/10 bg-slate-900 pt-3 pb-4">
        {/* Audio chiqish qurilmalari: dinamik / quloqchin / headset */}
        {deviceOpen && outputs.length > 0 ? (
          <div className="mb-3 flex max-w-full flex-wrap items-center justify-center gap-2 px-6">
            {outputs.map((o) => (
              <button
                key={o.deviceId}
                type="button"
                data-call-output={o.deviceId}
                onClick={() => void pickOutput(o.deviceId)}
                className={cn(
                  "max-w-40 truncate rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  currentOutput === o.deviceId
                    ? "bg-white text-slate-900"
                    : "bg-white/15 text-white hover:bg-white/25",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-3 px-6 sm:gap-4">
          <button
            type="button"
            onClick={call.toggleMic}
            aria-label={call.micOn ? t("callMicOff") : t("callMicOn")}
            aria-pressed={!call.micOn}
            data-call-mic=""
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-full transition-colors",
              call.micOn ? "bg-white/20 hover:bg-white/30" : "bg-white text-slate-900",
            )}
          >
            {call.micOn ? <MicIcon /> : <MicOffIcon />}
          </button>

          {call.isVideo ? (
            <button
              type="button"
              onClick={call.toggleCam}
              aria-label={call.camOn ? t("callCamOff") : t("callCamOn")}
              aria-pressed={!call.camOn}
              data-call-cam=""
              className={cn(
                "inline-flex size-12 items-center justify-center rounded-full transition-colors",
                call.camOn ? "bg-white/20 hover:bg-white/30" : "bg-white text-slate-900",
              )}
            >
              {call.camOn ? <CamIcon /> : <CamOffIcon />}
            </button>
          ) : null}

          {supportsSink ? (
            <button
              type="button"
              onClick={() => setDeviceOpen((v) => !v)}
              aria-label={t("callAudioOutput")}
              aria-pressed={deviceOpen}
              title={t("callAudioOutput")}
              data-call-audio-output=""
              className={cn(
                "inline-flex size-12 items-center justify-center rounded-full transition-colors",
                deviceOpen ? "bg-white text-slate-900" : "bg-white/20 hover:bg-white/30",
              )}
            >
              <SpeakerIcon />
            </button>
          ) : null}

          <button
            type="button"
            onClick={call.hangUp}
            aria-label={t("callEnd")}
            data-call-hangup=""
            className="inline-flex size-14 items-center justify-center rounded-full bg-rose-600 transition-colors hover:bg-rose-500"
          >
            <PhoneOffIcon />
          </button>
        </div>
      </div>

      {call.phase === "ended" && call.error ? (
        <button
          type="button"
          onClick={call.dismiss}
          className="mx-auto mb-4 rounded-full bg-white/15 px-4 py-2 text-sm transition-colors hover:bg-white/25"
        >
          {t("callClose")}
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.28-.28.68-.36 1.03-.24 1.12.37 2.32.57 3.56.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

// Telegram uslubidagi "qo'ng'iroqni tugatish" — handset 135° aylantirilgan
// (telefonni joyiga qo'yish harakati).
function PhoneOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: "rotate(135deg)" }}>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.28-.28.68-.36 1.03-.24 1.12.37 2.32.57 3.56.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
    </svg>
  );
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
    </svg>
  );
}