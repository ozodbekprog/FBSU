"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, CardHeader, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

type ChatMessage = { role: "ai" | "user"; text: string };

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function Bubble({ ai, text }: { ai: boolean; text: string }) {
  return (
    <div className={cn("flex items-end gap-2", !ai && "flex-row-reverse")}>
      {ai ? (
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <SparkIcon className="size-3.5" />
        </span>
      ) : null}
      <span
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          ai
            ? "bg-white text-slate-700 ring-1 ring-slate-200"
            : "bg-brand-900 text-white",
        )}
      >
        {text}
      </span>
    </div>
  );
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <SparkIcon className="size-3.5" />
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2.5 ring-1 ring-slate-200">
        <span className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 animate-bounce rounded-full bg-brand-400"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </span>
    </div>
  );
}

export function AssignmentAi({ assignmentId }: { assignmentId: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    const next: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/assignments/${assignmentId}/ai`, {
        method: "POST",
        body: JSON.stringify({
          messages: next.slice(-8).map((message) => ({
            role: message.role === "ai" ? "assistant" : "user",
            content: message.text,
          })),
        }),
      });
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { reply?: string };
      } | null;

      if (response.status === 429) {
        setError(t("crsAiLimit"));
      } else if (!response.ok || !json?.ok || !json.data?.reply) {
        setError(json?.error ?? t("crsAiError"));
      } else {
        const reply = json.data.reply;
        setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      }
    } catch {
      setError(t("crsAiError"));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  const suggestions = [t("crsAiQ1"), t("crsAiQ2"), t("crsAiQ3")];

  return (
    <Card className="animate-fade-up">
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 text-white">
              <SparkIcon className="size-4" />
            </span>
            {t("crsAiTitle")}
          </span>
        }
        subtitle={t("crsAiSubtitle")}
        action={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              {t("crsAiClear")}
            </button>
          ) : (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-brand-700 uppercase ring-1 ring-brand-100">
              AI
            </span>
          )
        }
      />
      <CardBody className="space-y-4">
        <div
          ref={listRef}
          role="log"
          className="h-64 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:h-80"
        >
          <Bubble ai text={t("crsAiGreeting")} />
          {messages.map((message, index) => (
            <Bubble key={index} ai={message.role === "ai"} text={message.text} />
          ))}
          {busy ? <TypingBubble label={t("crsAiThinking")} /> : null}
        </div>

        {messages.length === 0 && !busy ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 transition-colors hover:border-brand-300 hover:bg-brand-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={1500}
            placeholder={t("crsAiPlaceholder")}
            className="resize-none leading-relaxed"
          />
          <Button
            type="button"
            onClick={() => void send(draft)}
            disabled={busy || draft.trim().length === 0}
            className="shrink-0"
          >
            <SendIcon />
            <span className="hidden sm:inline">{t("crsAiSend")}</span>
          </Button>
        </div>

        <p className="text-xs text-slate-500">{t("crsAiNote")}</p>
      </CardBody>
    </Card>
  );
}
