"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { takePendingReport } from "@/components/assistant/pending";

type ChatMessage = { role: "ai" | "user"; text: string; time: string; shot?: string };
type Captured = { message: string; stack?: string; url: string };

function fmtClock(value: Date) {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
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

/** Fariza belgisi — girih uslubidagi sakkiz qirrali yulduz (qo'sh kvadrat). */
function FarizaStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="6.2" y="6.2" width="11.6" height="11.6" />
      <rect x="6.2" y="6.2" width="11.6" height="11.6" transform="rotate(45 12 12)" />
    </svg>
  );
}

function FarizaAvatar({ className, animate }: { className?: string; animate?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#1A2036] text-[#E3C76A] " +
        (className ?? "")
      }
    >
      <FarizaStar className={"size-[15px] " + (animate ? "animate-spin-slow" : "")} />
    </span>
  );
}

/** Model javoblaridagi yengil markdown: **bold** va `code`. */
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-[#F5F8FF]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="rounded bg-[#232B47] px-1 py-0.5 text-[13px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function AssistantChat({ name, role }: { name: string; role: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [shot, setShot] = useState<{ dataUrl: string; name: string } | null>(null);
  const greeted = useRef(false);
  const autoSent = useRef(false);

  // Launcher (bug-assistant) ushlab qo'ygan global xatolarni
  // mount bilan bir marta o'qib olamiz (sessionStorage ichidan
  // o'chirib olinadi, takror o'qilmaydi).
  const [initialPending] = useState(() => takePendingReport());
  const captured = useRef<Captured | null>(
    initialPending
      ? {
          message: initialPending.message,
          stack: initialPending.stack,
          url: initialPending.url,
        }
      : null,
  );

  // Bo'sh holatda katta salomlashuv ko'rsatiladi; agar sahifaga ushlangan
  // xato bilan kirilgan bo'lsa — o'sha xabar suhbatga qo'shiladi.
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    setMessages((prev) => {
      if (!initialPending) return prev;
      return [
        ...prev,
        { role: "user", text: initialPending.message, time: fmtClock(new Date()) },
      ];
    });
  }, [initialPending]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const aiSay = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "ai", text, time: fmtClock(new Date()) }]);
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
        const reply =
          typeof json?.data?.reply === "string" ? json.data.reply.trim() : "";
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

  const sendReport = useCallback(async (overrideMessage?: string): Promise<void> => {
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
  }, [aiSay, messages, shot, t]);

  // Global xatolarni launcher (bug-assistant) ushlab, sessionStorage'ga
  // joylashtiradi. Sahifa ochilganda ularni bir marta o'qib chatga
  // qo'shamiz va autoSend bo'lsa adminga yuboramiz.
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
      aiSay(reply);
      if (shot && !sent) {
        await sendReport(value);
      }
    },
    [aiSay, askAiReply, busy, messages, sent, sendReport, shot],
  );

  function handleSend() {
    void submit(input);
  }

  const suggestions = role === "STUDENT" ? SUGGESTIONS_STUDENT : SUGGESTIONS_STAFF;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-[#131829] shadow-[0_36px_90px_-48px_rgba(3,6,18,0.95)]"
      style={{
        backgroundImage: "radial-gradient(rgba(237,241,251,0.05) 1px, transparent 1.3px)",
        backgroundSize: "26px 26px",
      }}
    >
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
        style={{ scrollbarColor: "#2E3A5E transparent" }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <div className="max-w-[44rem]">
              <FarizaStar className="size-6 text-[#D4AF37]" />
              <h2 className="mt-5 font-serif text-[26px] leading-snug text-[#F2F5FD] sm:text-[30px]">
                {t("mscHeroHello", { name })}
              </h2>
              <p className="mt-2.5 max-w-[38rem] text-sm leading-6 text-[#9AA6C6]">
                {t("mscBugGreeting")}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                {suggestions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={busy}
                    onClick={() => void submit(t(key))}
                    className="rounded-full border border-[#D4AF37]/25 px-3.5 py-1.5 text-[13px] text-[#D9E0F2] transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] disabled:opacity-50"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) =>
              message.role === "ai" ? (
                <div key={`ai-${index}`} className="flex gap-3">
                  <FarizaAvatar className="mt-0.5" />
                  <div className="min-w-0 max-w-[46rem]">
                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#E7ECF9]">
                      {renderInline(message.text)}
                    </p>
                    {message.shot ? (
                      <img
                        src={message.shot}
                        alt={t("mscBugAttachedAlt")}
                        className="mt-2 max-h-36 max-w-full rounded-lg border border-[#D4AF37]/20"
                      />
                    ) : null}
                    <span className="mt-1 block text-[10px] text-[#7C88A8]">{message.time}</span>
                  </div>
                </div>
              ) : (
                <div key={`user-${index}`} className="flex justify-end">
                  <div className="min-w-0 max-w-[80%] sm:max-w-[70%]">
                    <div className="rounded-lg border-l-2 border-[#D4AF37]/60 bg-[#232B47] px-4 py-2.5 text-[15px] leading-7 text-[#EDF1FB]">
                      <p className="whitespace-pre-wrap">{renderInline(message.text)}</p>
                      {message.shot ? (
                        <img
                          src={message.shot}
                          alt={t("mscBugAttachedAlt")}
                          className="mt-2 max-h-36 max-w-full rounded-lg border border-[#D4AF37]/20"
                        />
                      ) : null}
                    </div>
                    <span className="mt-1 block text-right text-[10px] text-[#8B96B6]">
                      {message.time}
                    </span>
                  </div>
                </div>
              ),
            )}
            {busy ? (
              <div className="flex items-center gap-3" role="status" aria-label={t("mscBugTyping")}>
                <FarizaAvatar animate />
                <span className="flex items-center gap-1.5 py-2">
                  <span className="size-1.5 animate-bounce rounded-full bg-[#8B96B6] [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-[#8B96B6] [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-[#8B96B6]" />
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-[#D4AF37]/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        {shot ? (
          <div className="mb-3 flex items-center gap-3">
            <img
              src={shot.dataUrl}
              alt={t("mscBugAttachedAlt")}
              className="h-12 w-20 max-w-full rounded-lg border border-[#D4AF37]/25 object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[#9AA6C6]">{shot.name}</span>
            <button
              type="button"
              onClick={() => setShot(null)}
              className="text-xs text-[#E3C76A] transition-colors hover:text-[#F0DE9A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            >
              {t("mscBugRemove")}
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-1.5 rounded-2xl border border-[#D4AF37]/20 bg-[#1A2036] py-1.5 pe-1.5 ps-2 transition-colors focus-within:border-[#D4AF37]/55">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title={t("mscBugAttach")}
            aria-label={t("mscBugAttach")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#8B96B6] transition-colors hover:bg-[#232B47] hover:text-[#EDF1FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] disabled:opacity-50"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
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
            className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[15px] text-[#EDF1FB] outline-none placeholder:text-[#7C88A8]"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || busy}
            aria-label={t("mscBugSend")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#131829] transition-colors hover:bg-[#E3C76A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] disabled:opacity-40"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
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
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy || sent}
            onClick={() => void sendReport()}
            className={
              "text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] " +
              (sent ? "text-[#8FBF9F]" : "text-[#E3C76A] hover:text-[#F0DE9A] hover:underline")
            }
          >
            {sent
              ? t("mscBugSent")
              : shot
                ? t("mscBugSendReportShot")
                : t("mscBugSendReport")}
          </button>
          <span className="text-[10px] text-[#7C88A8]">{t("mscBugDetailsAdmin")}</span>
        </div>
      </div>
    </div>
  );
}
