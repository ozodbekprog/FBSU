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
};

export type ChatConversation = {
  id: string;
  participant: ChatParticipant;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

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
