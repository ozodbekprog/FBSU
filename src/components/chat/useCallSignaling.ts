"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Video qo'ng'iroq signallashuvi (polling + WebRTC).
 *
 * Media oqimi P2P — server orqali o'tmaydi. Server faqat signalni
 * (offer/answer/ICE) saqlaydi. Vercel serverless WebSocket serverini
 * qo'llab-quvvatlamagani uchun `GET /api/calls/active?since=` orqali
 * 1 soniyada bir marta so'raladi.
 *
 * Kutilayotgan muammolar va yechimi:
 *  - ICE signal yig'ilishi kerak (sahifa ochilgan paytdan boshlab),
 *    aks holda peer connection hech qachon ulanmaydi;
 *  - komponent unmount bo'lganda media oqimini to'liq to'xtatish kerak
 *    (track.stop()) — aks holda kamera yoniq qoladi.
 */

export type CallPhase =
  | "idle"
  | "starting"
  | "ringing-out" // chaqiryapti, javob kutilmoqda
  | "ringing-in" // chaqirilmoqda
  | "connecting" // javob qabul qilindi, ICE muhokamasi
  | "active" // bog'langan
  | "ended";

export type CallPeer = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
};

type CallState = {
  id: string;
  status: "RINGING" | "ACTIVE";
  conversationId: string;
  isCaller: boolean;
  createdAt: string;
  caller: CallPeer;
  callee: CallPeer;
};

type SignalRow = {
  id: string;
  type: "OFFER" | "ANSWER" | "ICE" | "HANGUP";
  payload: unknown;
  createdAt: string;
};

const POLL_MS = 1000;
/** "Onlayn bo'lg" yangilanishi — 60 soniya (server ham shu interval bilan). */
const PRESENCE_MS = 60_000;
const ICE_BUFFER_LIMIT = 60;

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export function useCallSignaling(currentUserId: string) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [call, setCall] = useState<CallState | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isVideo, setIsVideo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const sinceRef = useRef<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const callRef = useRef<CallState | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // signal almashinuvi tugallanmaganda yopilmasligi uchun "xotira" —
  // React state yangilanishining kechikishidan qat'i nazar olish maqsadida
  const remoteDescSetRef = useRef(false);
  // `tick` async bo'lgani uchun 1 soniyalik interval bilan chaqirilganda
  // ikki tur tushib ketishi mumkin. Ular bir xil OFFER signalini qayta
  // ishlab, `createPeer()` orqali birinchi peer connection'ni yopib
  // qo'yardi — natijada javob (ANSWER) hech qachon yuborilmasdi.
  const tickBusyRef = useRef(false);
  // Chaqirilgan tomonda `OFFER` foydalanuvchi javob bermaguncha shu yerda
  // saqlanadi.
  const pendingOfferRef = useRef<SignalRow | null>(null);
  // Aylanma bog'liqlikni uzish uchun ref'lar: `createPeer` ichida
  // `finish`/`sendSignal` ishlatiladi, ular esa `createPeer` dan keyin
  // e'lon qilinadi. Ref'lar orqali har doim eng yangi versiya chaqiriladi.
  const finishRef = useRef<() => Promise<void>>(null as unknown as () => Promise<void>);
  const sendSignalRef = useRef<(type: SignalRow["type"], payload?: unknown) => Promise<void>>(null as unknown as (type: SignalRow["type"], payload?: unknown) => Promise<void>);

  const cleanup = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {
        // allaqachon yopilgan
      }
    }
    for (const track of localRef.current?.getTracks() ?? []) track.stop();
    localRef.current = null;
    remoteRef.current = null;
    pendingIceRef.current = [];
    remoteDescSetRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const createPeer = useCallback(async (wantVideo: boolean) => {
    cleanup();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Audio qo'ng'iroqda kamera umuman so'ralmaydi — aks holda kamerasiz
    // qurilmada oddiy telefon qo'ng'iroqi ham ishlamay qolardi
    // ("Kamera yoki mikrofonga ruxsat berilmadi").
    const stream = wantVideo
      ? await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      : await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
    localRef.current = stream;
    setLocalStream(stream);
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    pc.ontrack = (event) => {
      const [incoming] = event.streams;
      if (incoming) {
        remoteRef.current = incoming;
        setRemoteStream(incoming);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setPhase("active");
      if (["failed", "closed"].includes(pc.connectionState)) {
        setError("Ulanish uzildi");
        void finishRef.current();
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate || !callRef.current) return;
      void sendSignalRef.current("ICE", event.candidate.toJSON());
    };

    // Video mavjudligi holatini saqlaymiz. Audio qo'ng'iroqda cam holati
    // muhim emas, ammo UI shu asosda ko'rinadi.
    setCamOn(wantVideo);

    return pc;
  }, [cleanup]);

  const sendSignal = useCallback(async (type: SignalRow["type"], payload?: unknown) => {
    const active = callRef.current;
    if (!active) return;
    await fetch(`/api/calls/${active.id}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    }).catch(() => {
      // signal uzlib qolsa ham media oqimi ko'pincha o'zi tiklanadi
    });
  }, []);
  useEffect(() => {
    sendSignalRef.current = sendSignal;
  }, [sendSignal]);

  const finish = useCallback(async () => {
    const active = callRef.current;
    stopPolling();
    if (active) {
      await fetch(`/api/calls/${active.id}/end`, { method: "POST" }).catch(() => {});
    }
    setPhase("ended");
    cleanup();
    // UI yopilishi uchun biroz kutamiz
    setTimeout(() => {
      callRef.current = null;
      sinceRef.current = null;
      cursorRef.current = null;
      setCall(null);
      setPeer(null);
      setPhase("idle");
    }, 600);
  }, [cleanup, stopPolling]);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const drainIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // eskirgan candidate — e'tiborsiz qoldiriladi
      }
    }
  }, []);

  const handleSignal = useCallback(
    async (row: SignalRow, active: CallState) => {
      const isCaller = active.isCaller;

      // Muhim: `pcRef` tekshiruvi yuqorida turmasligi kerak. Chaqirilgan
      // tomonda peer connection `OFFER` ni ishlash paytida YARATILADI —
      // ya'ni `pcRef.current` hali null. Yuqorida turgan `if (!pc) return`
      // chaqirilgan tomondagi `OFFER` ni ham qaytarib tashlar edi va
      // ulanish hech qachon boshlanmasdi.
      const existing = pcRef.current;

      if (row.type === "OFFER" && !isCaller) {
        // Chaqirilgan tomon hali javob bermagan bo'lsa, `OFFER` ni
        // bufferlaymiz. Aks holda peer connection foydalanuvchi "Javob
        // berish"ni bosishidan OLDIN yaratilib, chaqiruv oynasi
        // "Ulanmoqda" ga o'tib ketardi va tugmalar yo'qolardi.
        if (active.status !== "ACTIVE") {
          pendingOfferRef.current = row;
          return;
        }
        try {
          // Chaqiruvchi audio yoki video ekanini SDP dan aniqlaymiz:
          // `m=video` qatori bormi-yo'qmi shu belgi.
          const offerSdp =
            typeof row.payload === "object" && row.payload !== null && "sdp" in row.payload
              ? String((row.payload as { sdp?: unknown }).sdp ?? "")
              : "";
          const wantVideo = offerSdp.includes("m=video");
          setIsVideo(wantVideo);
          await createPeer(wantVideo);
          const current = pcRef.current;
          if (!current) return;
          await current.setRemoteDescription(row.payload as RTCSessionDescriptionInit);
          remoteDescSetRef.current = true;
          await drainIce(current);
          const answer = await current.createAnswer();
          await current.setLocalDescription(answer);
          await sendSignal("ANSWER", answer);
          setPhase("connecting");
        } catch {
          // kamera/mikrofon yoki signal buzilgan — foydalanuvchiga xabar beramiz
          setError("Ulanishni muhokama qilib bo'lmadi");
        }
        return;
      }

      if (row.type === "ANSWER" && isCaller) {
        try {
          // Chaqiruvchi tomonda peer connection `start()` da YARATILGAN va
          // uning lokal `OFFER`i bor. Uni qayta yaratish birinchisini
          // yopib, lokal tavsifsiz bo'sh ulanish qoldirardi — ICE umuman
          // boshlanmasdi. Faqat qarshi tavsifni qo'yamiz.
          const current = pcRef.current;
          if (!current) return;
          await current.setRemoteDescription(row.payload as RTCSessionDescriptionInit);
          remoteDescSetRef.current = true;
          await drainIce(current);
          setPhase("connecting");
        } catch {
          setError("Ulanishni muhokama qilib bo'lmadi");
        }
        return;
      }

      if (row.type === "ICE") {
        if (!existing) return;
        const candidate = row.payload as RTCIceCandidateInit;
        if (!remoteDescSetRef.current) {
          if (pendingIceRef.current.length < ICE_BUFFER_LIMIT) {
            pendingIceRef.current.push(candidate);
          }
          return;
        }
        try {
          await existing.addIceCandidate(candidate);
        } catch {
          // ehtimoliy eskirgan candidate
        }
        return;
      }

      if (row.type === "HANGUP") {
        void finish();
      }
    },
    [createPeer, drainIce, finish, sendSignal],
  );

  const runTick = useCallback(async () => {
    const params = new URLSearchParams();
    const active = callRef.current;
    if (active && cursorRef.current) {
      params.set("callId", active.id);
      params.set("since", cursorRef.current);
    }
    const res = await fetch(`/api/calls/active?${params.toString()}`, { cache: "no-store" }).catch(
      () => null,
    );
    if (!res || !res.ok) return;
    const json = (await res.json().catch(() => null)) as {
      ok: boolean;
      data?: { call: CallState | null; signals: SignalRow[]; serverTime: string };
    } | null;
    if (!json?.ok || !json.data) return;

    const { call: serverCall, signals, serverTime } = json.data;
    const discovered = !callRef.current;

    if (!serverCall) {
      if (callRef.current) {
        // server tomonda tugagan (javob berilmagan chaqiruv va h.k.)
        if (callRef.current.status === "RINGING") {
          setError(
            callRef.current.isCaller
              ? "Javob berilmadi"
              : "Chaqiruv bekor qilindi",
          );
        }
        void finish();
      }
      return;
    }

    if (discovered) {
      callRef.current = serverCall;
      setCall(serverCall);
      setPeer(serverCall.isCaller ? serverCall.callee : serverCall.caller);
      setPhase(serverCall.isCaller ? "ringing-out" : "ringing-in");
      //Muhim: kursor endi `serverTime` ga emas, chaqiruvning O'ZIGA
      // yaratilgan vaqtiga o'tadi. Aks holda chaqiruvni birinchi poll'da
      // topgan zahotiyoqqina yuborilgan signal (masalan chaqiruvchining
      // `OFFER`i) butunlay tushib ketar edi — keyingi so'rovda `since`
      // allaqach o'sha signaldan keyingi vaqtga teng bo'lardi.
      sinceRef.current = serverCall.createdAt;
      cursorRef.current = serverCall.createdAt;
    }

    if (signals.length > 0 && callRef.current) {
      const current = callRef.current;
      for (const row of signals) {
        await handleSignal(row, current);
      }
      sinceRef.current = signals[signals.length - 1].createdAt;
    }

    // Kursor faqat yangi signal qabul qilingandan keyin `serverTime` ga
    // suriladi. Aks holda javob berilgan holatda keyingi poll boshlanishidan
    // oldin yuborilgan signal (`ANSWER`) `since` dan tashqarida qolib ketar
    // edi — peer connection hech qachon ulanmagan.
    //
    // Chaqiruv birinchi kunda topilgan bo'lsa, kursor allaqach `createdAt`
    // ga qo'yilgan edi — uni darhol `serverTime` ga surish, o'sha zahot
    // yuborilgan `OFFER` ni butunlay tushirib qoldirardi.
    if (!discovered) {
      cursorRef.current = serverTime;
    }
  }, [finish, handleSignal]);

  const tick = useCallback(async () => {
    // Bir vaqtda faqat bitta so'rov yurishi kerak: `runTick` ichida
    // `createPeer()` chaqiriladi, u esa `cleanup()` orqali oldingi peer
    // connection'ni yopadi. Ikki tur tushsa, birinchisi mid-handshake
    // yo'q qilinadi va javob (ANSWER) umuman yuborilmaydi.
    if (tickBusyRef.current) return;
    tickBusyRef.current = true;
    try {
      await runTick();
    } finally {
      tickBusyRef.current = false;
    }
  }, [runTick]);

  // Chaqiruv kelishini kuzatish uchun doimiy polling
  useEffect(() => {
    pollRef.current = setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => {
      stopPolling();
      cleanup();
    };
  }, [cleanup, stopPolling, tick]);

  // "Onlayn bo'lg" vaqtini yangilash. Sarlavhada ko'rinadigan ma'lumot
  // bo'lgani uchun foydalanuvchi faol ekanini muntazam bildirish kerak.
  useEffect(() => {
    const ping = () => {
      void fetch("/api/chat/presence", { method: "POST" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, PRESENCE_MS);
    return () => clearInterval(id);
  }, []);

  const start = useCallback(
    async (
      conversationId: string,
      video = true,
      peer?: { id: string; name: string; avatarUrl: string | null; role: string },
    ) => {
      if (callRef.current) return;
      setError(null);
      setPhase("starting");
      setIsVideo(video);
      try {
        const res = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, media: video ? "video" : "audio" }),
        });
        const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "Qo'ng'iroqni boshlab bo'lmadi");
          setPhase("idle");
          return;
        }
        // media oqimini chaqiruv yuborilishidan oldin olamiz —
        // aks holda callee javob bergan payt biz hali tayyor emas
        await createPeer(video);
        const pc = pcRef.current;
        if (!pc) {
          setError(video ? "Kameraga kirib bo'lmadi" : "Mikrofonga kirib bo'lmadi");
          setPhase("idle");
          return;
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        callRef.current = {
          id: (json as unknown as { data?: { id: string } }).data?.id ?? "",
          status: "RINGING",
          conversationId,
          isCaller: true,
          createdAt: new Date().toISOString(),
          caller: {
            id: currentUserId,
            name: peer?.name ?? "",
            avatarUrl: peer?.avatarUrl ?? null,
            role: peer?.role ?? "",
          },
          callee: { id: "", name: "", avatarUrl: null, role: "" },
        };
        await sendSignal("OFFER", offer);
        setPhase("ringing-out");
      } catch {
        setError("Kamera yoki mikrofonga ruxsat berilmadi");
        setPhase("idle");
        cleanup();
      }
    },
    [cleanup, createPeer, currentUserId, sendSignal],
  );

  const accept = useCallback(async () => {
    const active = callRef.current;
    if (!active || active.isCaller) return;
    const res = await fetch(`/api/calls/${active.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setError("Javobni yuborib bo'lmadi");
      return;
    }
    if (callRef.current) callRef.current.status = "ACTIVE";
    setPhase("connecting");
    // Bufferda turgan `OFFER` ni endi ishlaymiz — foydalanuvchi "Javob
    // berish"ni bosdi, endi peer connection yaratish va `ANSWER` yuborish
    // o'rinli.
    const offer = pendingOfferRef.current;
    if (offer && callRef.current) {
      pendingOfferRef.current = null;
      await handleSignal(offer, callRef.current);
    }
  }, [handleSignal]);

  const decline = useCallback(async () => {
    const active = callRef.current;
    if (!active) return;
    await fetch(`/api/calls/${active.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    }).catch(() => null);
    void finish();
  }, [finish]);

  const hangUp = useCallback(() => void finish(), [finish]);

  const toggleMic = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) return;
    const next = !micOn;
    for (const track of tracks) track.enabled = next;
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const next = !camOn;
    for (const track of tracks) track.enabled = next;
    setCamOn(next);
  }, [camOn]);

  const dismiss = useCallback(() => {
    cleanup();
    callRef.current = null;
    setCall(null);
    setPeer(null);
    setError(null);
    setPhase("idle");
  }, [cleanup]);

  return {
    phase,
    call,
    peer,
    localStream,
    remoteStream,
    micOn,
    camOn,
    isVideo,
    error,
    start,
    accept,
    decline,
    hangUp,
    toggleMic,
    toggleCam,
    dismiss,
  };
}