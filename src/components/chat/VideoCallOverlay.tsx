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
  const mounted = useState(true);

  const active = call.phase !== "idle" && call.phase !== "ended";
  const connected = call.phase === "active";

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
      if (node && call.remoteStream) {
        node.srcObject = call.remoteStream;
        void node.play().catch(() => {});
      }
    },
    [call.remoteStream],
  );

  if (!mounted || (!active && !call.error)) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("callTitle")}
      data-call-overlay=""
      className={cn(
        "fixed inset-0 z-[60] flex flex-col bg-[#020617] text-white",
        // mobil brauzerlar uchun xavfsiz zona
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      {/* qarshi tomon video */}
      <div className="relative min-h-0 flex-1 bg-[#0f172a]">
        <video
          ref={attachRemote}
          autoPlay
          playsInline
          className={cn("size-full object-cover", !call.remoteStream && "hidden")}
        />

        {!call.remoteStream ? (
          <div className="flex size-full flex-col items-center justify-center gap-5 px-6 text-center">
            {call.peer ? (
              <Avatar name={call.peer.name} src={call.peer.avatarUrl} size={104} />
            ) : (
              <div className="size-24 animate-pulse rounded-full bg-[#1e293b]" />
            )}
            <div>
              <p className="text-xl font-semibold">{call.peer?.name ?? t("callConnecting")}</p>
              <p className="mt-1.5 text-sm text-[#94a3b8]">
                {call.phase === "ringing-in" && t("callIncoming")}
                {call.phase === "ringing-out" && t("callRinging")}
                {call.phase === "connecting" && t("callConnecting")}
                {connected && t("callConnected")}
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

        {/* o'z videomiz — burchakda */}
        {call.localStream ? (
          <div className="absolute right-3 bottom-3 w-28 overflow-hidden rounded-2xl border border-white/20 bg-[#1e293b] shadow-lg sm:w-40">
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
              <div className="absolute inset-0 flex items-center justify-center bg-[#1e293b]">
                <VideoOffIcon className="size-6 text-[#94a3b8]" />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* yuqorida holat yorlig'i */}
        {call.error ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-rose-500/90 px-3.5 py-1.5 text-xs font-medium">
            {call.error}
          </div>
        ) : null}

        <div className="absolute bottom-3 left-3 max-w-[60%] rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
          {t("callServerPending")}
        </div>
      </div>

      {/* boshqaruvlar */}
      <div className="flex items-center justify-center gap-4 px-6 py-5">
        <button
          type="button"
          onClick={call.toggleMic}
          aria-label={call.micOn ? t("callMicOff") : t("callMicOn")}
          aria-pressed={!call.micOn}
          data-call-mic=""
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-full transition-colors",
            call.micOn ? "bg-white/15 hover:bg-white/25" : "bg-[#f8fafc] text-[#0f172a]",
          )}
        >
          {call.micOn ? <MicIcon /> : <MicOffIcon />}
        </button>

        <button
          type="button"
          onClick={call.toggleCam}
          aria-label={call.camOn ? t("callCamOff") : t("callCamOn")}
          aria-pressed={!call.camOn}
          data-call-cam=""
          className={cn(
            "inline-flex size-12 items-center justify-center rounded-full transition-colors",
            call.camOn ? "bg-white/15 hover:bg-white/25" : "bg-[#f8fafc] text-[#0f172a]",
          )}
        >
          {call.camOn ? <CamIcon /> : <CamOffIcon />}
        </button>

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

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.4 21 3 13.6 3 4.5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.7z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 9c-1.6 0-3.2.2-4.7.6l2.1 2.1-.9 2.2-2.2.9-2.3-2.3A11.9 11.9 0 0 0 2.3 14l2.9 2.9a1.6 1.6 0 0 0 2.3 0l1.6-1.6 5.8 5.8V23h1.5l1.2-1.2v-3.6l3.2-3.2 2 2a1.6 1.6 0 0 0 2.3 0l2.9-2.9c-1.5-1.1-3.2-1.9-5-2.4l-2.3 2.3-.9-2.2.9-2.2 2.2-.9 2.7 2.7a1.6 1.6 0 0 0 2.3 0l1.6-1.6V10c0-.6-.4-1-1-1H12z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M19 10a7 7 0 0 1-.6 2.8M12 17v5M5 10a7 7 0 0 0 10.9 5.8M2 2l20 20" />
    </svg>
  );
}

function CamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 10 4.6-2.3A1 1 0 0 1 22 8.6v6.8a1 1 0 0 1-1.4.9L16 14" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 16v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2m2.6 0H14a2 2 0 0 1 2 2v.3M22 8.6v6.8a1 1 0 0 1-1.4.9L16 14M2 2l20 20" />
    </svg>
  );
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 16v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2m2.6 0H14a2 2 0 0 1 2 2v.3M22 8.6v6.8a1 1 0 0 1-1.4.9L16 14M2 2l20 20" />
    </svg>
  );
}