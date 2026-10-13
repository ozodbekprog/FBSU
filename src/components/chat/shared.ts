import { fmtDate } from "@/lib/utils";
import type { Dictionary } from "@/i18n/uz";

export type Translate = (
  key: keyof Dictionary,
  params?: Record<string, string | number>,
) => string;

export type ChatParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  lastSeenAt?: string | null;
};

export type ChatConversation = {
  id: string;
  participant: ChatParticipant;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
};

/**
 * "Onlayn bo'lg" vaqtini inson o'quydigan shaklga keltiradi.
 *
 * Telegram uslubi: bir necha daqiqa oldin — "onlayn", bir kecha oldin —
 * "kecha 17:00 da", eskiroq — aniq sana.
 */
export function lastSeenLabel(value: string | null | undefined, t: Translate) {
  if (!value) return t("msgLastSeenUnknown");
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 5) return t("msgLastSeenOnline");
  if (minutes < 60) return t("msgLastSeenMinutes", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("msgLastSeenHours", { hours });
  const days = Math.floor(hours / 24);
  if (days === 1) return `${t("msgLastSeenYesterday")} ${fmtClock(value)}`;
  if (days < 7) return t("msgLastSeenDays", { days });
  return t("msgLastSeenDate", { date: fmtDate(value) });
}

export type ChatCall = {
  id: string;
  status: "RINGING" | "ACTIVE" | "ENDED" | "DECLINED" | "MISSED";
  media: "AUDIO" | "VIDEO";
  callerId: string;
  calleeId: string;
  durationSec: number | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type?: "TEXT" | "VOICE" | "FILE" | "CALL";
  isRead: boolean;
  createdAt: string;
  forwardedFromId?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyToId?: string | null;
  replyTo?: { id: string; senderId: string; body: string } | null;
  call?: ChatCall;
  attachments?: {
    id: string;
    kind: "VOICE" | "IMAGE" | "FILE";
    mimeType: string;
    base64?: string;
    size?: number;
    durationSec?: number;
    fileName?: string;
  }[];
};

/**
 * Qo'ng'iroq yozuvining sarlavha kaliti.
 *
 * `viewerIsCaller` — joriy foydalanuvchi qo'ng'iroq qilgan tomonmi.
 * Chiquvchi qo'ng'iroq bekor qilinganda (javob berilmasdan) chaqiruvchi
 * uchun "bekor qilindi", chaqirilgan uchun "javob berilmadi" ko'rinadi.
 */
export function callTitleKey(call: ChatCall, viewerIsCaller: boolean): keyof Dictionary {
  const video = call.media === "VIDEO";
  switch (call.status) {
    case "RINGING":
      return viewerIsCaller ? "callLogRinging" : video ? "callLogIncomingVideo" : "callLogIncoming";
    case "ACTIVE":
      return "callLogActive";
    case "DECLINED":
      return "callLogDeclined";
    case "MISSED":
      return viewerIsCaller
        ? video
          ? "callLogCancelledVideo"
          : "callLogCancelled"
        : "callLogMissed";
    default:
      return viewerIsCaller
        ? video
          ? "callLogOutgoingVideo"
          : "callLogOutgoing"
        : video
          ? "callLogIncomingVideo"
          : "callLogIncoming";
  }
}

/** Javobsiz/rad etilgan qo'ng'iroqni qizil rangda ko'rsatish kerakmi. */
export function callMissedTone(call: ChatCall, viewerIsCaller: boolean): boolean {
  if (call.status === "DECLINED") return true;
  return call.status === "MISSED" && !viewerIsCaller;
}

/** Qo'ng'iroq davomiyligi — "8 s", "1 daq 5 s", "3 daq". */
export function fmtCallDuration(seconds: number, t: Translate): string {
  if (seconds < 60) return t("callLogDurSeconds", { seconds });
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (rest === 0) return t("callLogDurMinutesOnly", { minutes });
  return t("callLogDurMinutes", { minutes, seconds: rest });
}

export function roleLabel(role: ChatParticipant["role"], t: Translate) {
  if (role === "ADMIN") return t("roleAdmin");
  if (role === "TEACHER") return t("roleTeacher");
  return t("roleStudent");
}

export function fmtClock(value: string) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function dayDiff(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today.getTime() - target.getTime()) / 86400000);
}

export function dayKey(value: string) {
  return new Date(value).toDateString();
}

export function fmtDayLabel(value: string, t: Translate) {
  const diff = dayDiff(value);
  if (diff === 0) return t("msgToday");
  if (diff === 1) return t("msgYesterday");
  return fmtDate(value);
}

export function fmtListTime(value: string, t: Translate) {
  const date = new Date(value);
  const diff = dayDiff(value);
  if (diff === 0) return fmtClock(value);
  if (diff === 1) return t("msgYesterday");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

export function previewText(
  conversation: ChatConversation,
  currentUserId: string,
  t: Translate,
) {
  if (!conversation.lastMessage) return t("msgNoMessages");
  const prefix = conversation.lastMessage.senderId === currentUserId ? t("msgYouPrefix") : "";
  return `${prefix}${conversation.lastMessage.body}`;
}
