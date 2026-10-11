"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecording = {
  base64: string;
  durationSec: number;
  mimeType: string;
};

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(type)) {
      return type;
    }
  }
  return "";
}

/** Blob'ni sof base64'ga aylantiradi (data URL prefiksisiz). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Ovoz yozuv holatini kuzatuvchi hook (MediaRecorder API).
 *
 * Qaytarilayotgini:
 * - isRecording: qayd holati
 * - audioDuration: davomiylik (soniya)
 * - startRecording: qaydni boshlash
 * - stopRecording: qaydni to'xtatib, `{ base64, durationSec, mimeType }`
 *   qaytaradi (yuborishga tayyor) yoki hech narsa yozilmagan bo'lsa `null`.
 * - cancelRecording: yozuvni bekor qilish (hech narsa saqlanmaydi).
 */
export function useVoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setAudioDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setAudioDuration((prev) => prev + 1), 1000);
    } catch (err) {
      console.error("Qayd qilish xatosi:", err);
      cleanup();
      setIsRecording(false);
      throw err;
    }
  }, [cleanup]);

  const stopRecording = useCallback(async (): Promise<VoiceRecording | null> => {
    const recorder = recorderRef.current;
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const duration = audioDuration;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      recorderRef.current = null;
      setIsRecording(false);
      setAudioDuration(0);
      return null;
    }
    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
      recorder.onerror = () => resolve(null);
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });
    recorderRef.current = null;
    cleanup();
    setIsRecording(false);
    setAudioDuration(0);
    if (!blob || blob.size === 0) return null;
    const base64 = await blobToBase64(blob).catch(() => null);
    if (!base64) return null;
    return { base64, durationSec: duration, mimeType: blob.type || "audio/webm" };
  }, [audioDuration, cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.onerror = null;
      try {
        recorder.stop();
      } catch {
        /* hech narsa */
      }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    cleanup();
    setIsRecording(false);
    setAudioDuration(0);
  }, [cleanup]);

  return { isRecording, audioDuration, startRecording, stopRecording, cancelRecording };
}
