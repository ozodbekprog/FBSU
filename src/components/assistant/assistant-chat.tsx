"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { takePendingReport } from "@/components/assistant/pending";

type ChatMessage = { role: "ai" | "user"; text: string; time: string; shot?: string };
type Captured = { message: string; stack?: string; url: string };
type Session = { id: string; title: string; at: number; messages: { role: "ai" | "user"; text: string; time: string }[] };

const SESSIONS_KEY = "fariza.sessions.v1";

function fmtClock(value: Date) {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function loadSessions(): Session[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed)
      ? parsed
          .filter((session) => session && typeof session.id === "string" && Array.isArray(session.messages))
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function storeSessions(list: Session[]) {
  try {
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  } catch {
    void 0;
  }
}

const SUGGESTIONS_STUDENT = [
  "mscSuggestStudent1",
  "mscSuggestStudent2",
  "mscSuggestStudent3",
  "mscSuggestStudent4",
] as const;
const SUGGESTIONS_STAFF = [
  "mscSuggestStaff1",
  "mscSuggestStaff2",
  "mscSuggestStaff3",
  "mscSuggestStaff4",
] as const;

function FarizaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="11" className="fill-gold-400" />
      <path
        d="M14 9h20v5.6H19.6v6.2H28v5.6h-8.4v12.6H14V9Z"
        className="fill-white dark:fill-[#0e1729]"
        transform="translate(24 24) scale(0.8) translate(-24 -24)"
      />
    </svg>
  );
}

function FarizaAvatar({ className, animate }: { className?: string; animate?: boolean }) {
  return <FarizaMark className={"size-8 shrink-0 select-none " + (animate ? "animate-spin-slow " : "") + (className ?? "")} />;
}

function SuggestionIcon({ index }: { index: number }) {
  switch (index % 4) {
    case 0:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
        </svg>
      );
    case 1:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h5L20.4 8.6a2.1 2.1 0 0 0-3-3L6 17v3Z" />
          <path d="M14.5 6.5l3 3" />
        </svg>
      );
    case 2:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
          <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
        </svg>
      );
    default:
      return (
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4l1.8 4.6L18 10l-4.2 1.4L12 16l-1.8-4.6L6 10l4.2-1.4Z" />
          <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
        </svg>
      );
  }
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function AssistantChat({ name, role, status }: { name: string; role: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [shot, setShot] = useState<{ dataUrl: string; name: string } | null>(null);
  const greeted = useRef(false);
  const autoSent = useRef(false);

  const [initialPending] = useState(() => takePendingReport());
  const captured = useRef<Captured | null>(
    initialPending
      ? { message: initialPending.message, stack: initialPending.stack, url: initialPending.url }
      : null,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions((prev) => (prev.length > 0 ? prev : loadSessions()));
  }, []);

  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    setMessages((prev) => {
      if (!initialPending) return prev;
      return [...prev, { role: "user", text: initialPending.message, time: fmtClock(new Date()) }];
    });
  }, [initialPending]);

  useEffect(() => {
    const el = listRef.current;
    if (el && messages.length > 0) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const aiSay = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "ai", text, time: fmtClock(new Date()) }]);
  }, []);

  const stampSession = useCallback((list: ChatMessage[], id?: string) => {
    const firstUser = list.find((message) => message.role === "user");
    if (!firstUser) return;
    const sessionId = id ?? currentIdRef.current ?? `f-${Date.now().toString(36)}`;
    currentIdRef.current = sessionId;
    setCurrentId(sessionId);
    const entry: Session = {
      id: sessionId,
      title: firstUser.text.replace(/\s+/g, " ").slice(0, 44),
      at: Date.now(),
      messages: list.map((message) => ({ role: message.role, text: message.text, time: message.time })),
    };
    setSessions((prev) => {
      const next = [entry, ...prev.filter((session) => session.id !== sessionId)].slice(0, 20);
      storeSessions(next);
      return next;
    });
  }, []);

  const askAiReply = useCallback(
    async (pending: ChatMessage[]): Promise<string> => {
      try {
        const res = await apiFetch("/api/assistant/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: pending.slice(-8).map((message) => ({
              role: message.role === "ai" ? "assistant" : "user",
              content: message.text,
            })),
            context: captured.current
              ? { url: captured.current.url, errorMessage: captured.current.message }
              : undefined,
          }),
        });
        const json = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              data?: {
                reply?: string;
                actions?: { type?: string; path?: string; title?: string }[];
              };
            }
          | null;
        const actions = json?.data?.actions ?? [];
        const nav = actions.find(
          (action) => action.type === "navigate" && typeof action.path === "string" && action.path,
        );
        if (nav?.path) {
          const target = nav.path;
          router.push(target);
          window.setTimeout(() => {
            if (window.location.pathname !== target) {
              window.location.assign(target);
            }
          }, 700);
        }
        const reply = typeof json?.data?.reply === "string" ? json.data.reply.trim() : "";
        if (reply) {
          return nav?.path
            ? `${reply}\n\n${t("mscBugOpenedPageLine", { target: nav.title || nav.path })}`
            : reply;
        }
        if (nav?.path) return t("mscBugOpenedPage", { target: nav.title || nav.path });
      } catch {
        void 0;
      }
      return t("mscBugNoReply");
    },
    [router, t],
  );

  const attachImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        aiSay(t("mscBugOnlyImage"));
        return;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (dataUrl.length > 3_500_000) {
          aiSay(t("mscBugImageTooBig"));
          return;
        }
        setShot({ dataUrl, name: file.name });
        setSent(false);
        aiSay(t("mscBugImageAttached"));
      } catch {
        aiSay(t("mscBugImageError"));
      }
    },
    [aiSay, t],
  );

  const sendReport = useCallback(
    async (overrideMessage?: string): Promise<void> => {
      setBusy(true);
      try {
        const res = await apiFetch("/api/bugs", {
          method: "POST",
          body: JSON.stringify({
            message: overrideMessage?.trim() || captured.current?.message || t("mscBugSubmittedByAi"),
            stack: captured.current?.stack,
            url: captured.current?.url ?? window.location.pathname,
            note: messages
              .filter((message) => message.role === "user")
              .map((message) => message.text)
              .join(" | ")
              .slice(0, 1000),
            attachment: shot?.dataUrl,
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (!res.ok || !json?.ok) throw new Error("failed");
        setSent(true);
        setShot(null);
        aiSay(t("mscBugReportSent"));
      } catch {
        aiSay(t("mscBugReportError"));
      } finally {
        setBusy(false);
      }
    },
    [aiSay, messages, shot, t],
  );

  useEffect(() => {
    if (!initialPending?.autoSend || autoSent.current) return;
    autoSent.current = true;
    void sendReport(initialPending.message);
  }, [initialPending, sendReport]);

  const submit = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value || busy) return;
      const pending: ChatMessage[] = [
        ...messages,
        { role: "user", text: value, time: fmtClock(new Date()), shot: shot?.dataUrl },
      ];
      setMessages(pending);
      setInput("");
      setBusy(true);
      const reply = await askAiReply(pending);
      setBusy(false);
      const full: ChatMessage[] = [...pending, { role: "ai", text: reply, time: fmtClock(new Date()) }];
      setMessages(full);
      stampSession(full);
      if (shot && !sent) {
        await sendReport(value);
      }
    },
    [askAiReply, busy, messages, sent, sendReport, shot, stampSession],
  );

  function handleSend() {
    void submit(input);
  }

  const openSession = useCallback(
    (session: Session) => {
      if (busy) return;
      currentIdRef.current = session.id;
      setCurrentId(session.id);
      setMessages(session.messages.map((message) => ({ role: message.role, text: message.text, time: message.time })));
    },
    [busy],
  );

  const newSession = useCallback(() => {
    if (busy) return;
    currentIdRef.current = null;
    setCurrentId(null);
    setMessages([]);
    setInput("");
    setSent(false);
    setShot(null);
  }, [busy]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const session of [...sessions].sort((a, b) => b.at - a.at)) {
      const text = session.messages.find((message) => message.role === "user")?.text?.trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        out.push(text);
      }
      if (out.length >= 4) break;
    }
    return out;
  }, [sessions]);

  const suggestions = role === "STUDENT" ? SUGGESTIONS_STUDENT : SUGGESTIONS_STAFF;
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const shotsRow = shot ? (
    <div className="mb-2.5 flex items-center gap-3">
      <img
        src={shot.dataUrl}
        alt={t("mscBugAttachedAlt")}
        className="h-12 w-20 max-w-full rounded-lg border border-slate-200 object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500">{shot.name}</span>
      <button
        type="button"
        onClick={() => setShot(null)}
        className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        {t("mscBugRemove")}
      </button>
    </div>
  ) : null;

  const composerCard = (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card transition-all focus-within:border-brand-300 focus-within:shadow-lift focus-within:ring-4 focus-within:ring-brand-500/10">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-800">
          <FarizaMark className="size-4" />
          Fariza
        </span>
        <span className="rounded-full border border-gold-400/40 bg-gold-400/10 px-2 py-[2px] text-[10px] font-medium text-gold-800">
          {t("mscAgentBadge")}
        </span>
      </div>
      <input
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleSend();
          }
        }}
        onPaste={(event) => {
          const items = Array.from(event.clipboardData?.items ?? []);
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                void attachImage(file);
                return;
              }
            }
          }
        }}
        placeholder={t("mscBugInputPlaceholder")}
        aria-label={t("mscBugInputAria")}
        className="w-full bg-transparent px-4 pb-1 pt-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
      />
      <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title={t("mscBugAttach")}
          aria-label={t("mscBugAttach")}
          className="flex size-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || busy}
          aria-label={t("mscBugSend")}
          className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:bg-slate-200 disabled:text-slate-400"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  const reportRow = (
    <div className="flex items-center justify-between gap-3 px-1">
      <button
        type="button"
        disabled={busy || sent}
        onClick={() => void sendReport()}
        className={
          "text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 " +
          (sent ? "text-emerald-600" : "text-brand-600 hover:text-brand-500 hover:underline")
        }
      >
        {sent ? t("mscBugSent") : shot ? t("mscBugSendReportShot") : t("mscBugSendReport")}
      </button>
      <span className="text-[10px] text-slate-400">{t("mscBugDetailsAdmin")}</span>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden border-t border-slate-200 bg-white">
      <aside className="hidden w-60 shrink-0 flex-col border-e border-slate-200 bg-slate-50 md:flex lg:w-64">
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <FarizaMark className="size-8 shrink-0 select-none" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Fariza</p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              {status}
            </p>
          </div>
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={newSession}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-900 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("mscNewSession")}
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          <p className="px-1 pb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
            {t("mscSessionsTitle")}
          </p>
          {sessions.length === 0 ? (
            <p className="px-1 py-1.5 text-[11px] text-slate-400">{t("mscSessionsEmpty")}</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => openSession(session)}
                className={
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors " +
                  (currentId === session.id
                    ? "bg-brand-50 font-medium text-brand-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                }
              >
                <span className="truncate">{session.title}</span>
              </button>
            ))
          )}
          {recent.length > 0 ? (
            <>
              <p className="px-1 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {t("mscRecentTitle")}
              </p>
              {recent.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void submit(prompt)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <span className="truncate">{prompt}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-card">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
              {initials}
            </span>
            <span className="min-w-0 truncate text-[12px] text-slate-700">{name}</span>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col bg-white">
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-[40rem] text-center">
                <FarizaMark className="mx-auto block size-14" />
                <h2 className="mt-5 text-[24px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[28px]">
                  {t("mscHeroHello", { name })}
                </h2>
                <p className="mx-auto mt-2.5 max-w-[36rem] text-sm leading-6 text-slate-500">
                  {t("mscBugGreeting")}
                </p>
                <div className="mt-7">
                  {shotsRow}
                  {composerCard}
                  <div className="mt-2.5">{reportRow}</div>
                </div>
                <div className="mt-7 grid gap-2.5 text-left sm:grid-cols-2">
                  {suggestions.map((key, index) => (
                    <button
                      key={key}
                      type="button"
                      disabled={busy}
                      onClick={() => void submit(t(key))}
                      className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-600">
                        <SuggestionIcon index={index} />
                      </span>
                      <span className="min-w-0 truncate text-[13.5px] font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                        {t(key)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) =>
                message.role === "ai" ? (
                  <div key={`ai-${index}`} className="flex gap-3.5">
                    <FarizaAvatar className="mt-0.5" />
                    <div className="min-w-0 max-w-[46rem]">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-[13.5px] font-semibold text-slate-900">Fariza</span>
                        <span className="text-[10px] text-slate-400">{message.time}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                        {renderInline(message.text)}
                      </p>
                      {message.shot ? (
                        <img
                          src={message.shot}
                          alt={t("mscBugAttachedAlt")}
                          className="mt-2 max-h-36 max-w-full rounded-xl border border-slate-200"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div key={`user-${index}`} className="flex justify-end">
                    <div className="min-w-0 max-w-[80%] sm:max-w-[70%]">
                      <div className="rounded-2xl rounded-br-md border border-brand-100 bg-brand-50 px-4 py-2.5 text-[15px] leading-7 text-brand-950">
                        <p className="whitespace-pre-wrap">{renderInline(message.text)}</p>
                        {message.shot ? (
                          <img
                            src={message.shot}
                            alt={t("mscBugAttachedAlt")}
                            className="mt-2 max-h-36 max-w-full rounded-xl border border-brand-100"
                          />
                        ) : null}
                      </div>
                      <span className="mt-1 block pe-1 text-right text-[10px] text-slate-400">{message.time}</span>
                    </div>
                  </div>
                ),
              )}
              {busy ? (
                <div className="flex items-center gap-3" role="status" aria-label={t("mscBugTyping")}>
                  <FarizaAvatar animate />
                  <span className="flex items-center gap-1.5 py-2">
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {messages.length > 0 ? (
          <div className="border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {shotsRow}
            {composerCard}
            <div className="mt-2">{reportRow}</div>
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void attachImage(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
