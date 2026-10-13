"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, Input, Label, Select } from "@/components/ui";
import { apiFetch } from "@/components/quiz/api";
import { useI18n } from "@/components/i18n/LocaleProvider";
import { DEFAULT_MAX_WARNINGS, MAX_WARNINGS_LIMIT } from "@/modules/secure-exam/config";
import { formatExamCode } from "@/modules/secure-exam/code";

export type QuizOption = {
  id: string;
  title: string;
  courseTitle: string;
  timeLimitMin: number | null;
};

const QUICK_MINUTES = [30, 45, 60] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStart(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5 - (date.getMinutes() % 5), 0, 0);
  return toLocalInput(date);
}

function defaultEnd(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 5 - (date.getMinutes() % 5), 0, 0);
  date.setHours(date.getHours() + 2);
  return toLocalInput(date);
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 transition hover:border-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-brand-700"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

type Created = { id: string; code: string };

export function CreateForm({
  quizzes,
  initialQuizId,
}: {
  quizzes: QuizOption[];
  initialQuizId?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const initial = quizzes.find((quiz) => quiz.id === initialQuizId) ?? quizzes[0] ?? null;

  const [quizId, setQuizId] = useState(initial?.id ?? "");
  const [title, setTitle] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(defaultEnd);
  const [durationMin, setDurationMin] = useState("");
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [blockCopy, setBlockCopy] = useState(true);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [requireClient, setRequireClient] = useState(false);
  const [maxWarnings, setMaxWarnings] = useState(DEFAULT_MAX_WARNINGS);
  const [limitAction, setLimitAction] = useState<"WARN" | "TERMINATE">("TERMINATE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const selected = quizzes.find((quiz) => quiz.id === quizId) ?? null;

  function autoTitle(): string {
    const now = new Date();
    const date = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
    return selected ? `${selected.title} — ${date}` : t("secTitle");
  }

  function resolveTitle(): string {
    return title.trim() === "" ? autoTitle() : title.trim();
  }

  function handleResult(result: { ok: true; data: Created } | { ok: false; error: string }) {
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setCreated(result.data);
    setBusy(null);
    router.refresh();
  }

  async function quickStart(minutes: number) {
    if (busy) return;
    if (!quizId) {
      setError(t("secPickQuiz"));
      return;
    }
    setBusy(`quick:${minutes}`);
    setError(null);
    const now = new Date();
    const result = await apiFetch<Created>(
      "/api/secure-exams",
      "POST",
      {
        quizId,
        title: resolveTitle(),
        startsAt: new Date(now.getTime() - 60_000).toISOString(),
        endsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        durationMin: minutes,
        requireFullscreen: true,
        blockCopy: true,
        requireClient: false,
        webcamEnabled: false,
        maxWarnings: DEFAULT_MAX_WARNINGS,
        limitAction: "TERMINATE",
      },
      t("commonError"),
    );
    handleResult(result);
  }

  async function submitAdvanced() {
    if (busy) return;
    if (!quizId) {
      setError(t("secPickQuiz"));
      return;
    }
    setBusy("advanced");
    setError(null);
    const duration = durationMin.trim() === "" ? null : Number(durationMin);
    const result = await apiFetch<Created>(
      "/api/secure-exams",
      "POST",
      {
        quizId,
        title: resolveTitle(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        durationMin: duration !== null && Number.isFinite(duration) ? duration : null,
        requireFullscreen,
        blockCopy,
        requireClient,
        webcamEnabled,
        maxWarnings,
        limitAction,
      },
      t("commonError"),
    );
    handleResult(result);
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(formatExamCode(created.code));
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/e/${created.code}`);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  }

  if (created) {
    return (
      <Card className="p-5">
        <p className="text-sm font-medium text-emerald-700">
          {t("secCreatedCode", { code: formatExamCode(created.code) })}
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <img
            src={`/api/secure-exams/${created.id}/qr`}
            alt={t("secQrHint")}
            className="size-28 rounded-xl border border-slate-200 bg-white p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-3xl font-semibold tracking-[0.25em] text-brand-950">
              {formatExamCode(created.code)}
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-500">
              {window.location.origin}/e/{created.code}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
                {copiedLink ? t("secCopied") : t("secCopyLink")}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void copyCode()}>
                {copiedCode ? t("secCopied") : t("secCopyCode")}
              </Button>
              <ButtonLink href={`/secure-exams/${created.id}`} size="sm">
                {t("secMonitor")}
              </ButtonLink>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreated(null);
                  setTitle("");
                }}
              >
                {t("secCreate")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t("secQrHint")}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-500">{t("secNoExamsDesc")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <p className="font-semibold tracking-tight text-slate-900">{t("secQuickTitle")}</p>
      <p className="mt-1 text-sm text-slate-500">{t("secQuickHint")}</p>

      <div className="mt-4 space-y-4">
        <div>
          <Label>{t("secFieldQuiz")}</Label>
          <Select value={quizId} onChange={(event) => setQuizId(event.target.value)}>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} — {quiz.courseTitle}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("secFieldTitle")}</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("secTitlePlaceholder")}
            maxLength={200}
          />
        </div>
      </div>

      {!advanced ? (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            {QUICK_MINUTES.map((minutes) => (
              <Button
                key={minutes}
                size="lg"
                disabled={busy !== null}
                onClick={() => void quickStart(minutes)}
              >
                {busy === `quick:${minutes}` ? t("secCreating") : t("secMinutes", { count: minutes })}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{t("secQuickNote")}</p>
          <button
            type="button"
            onClick={() => setAdvanced(true)}
            className="mt-3 text-sm font-medium text-brand-700 transition hover:text-brand-900 hover:underline"
          >
            {t("secAdvanced")} →
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>{t("secFieldStartsAt")}</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div>
              <Label>{t("secFieldEndsAt")}</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </div>
            <div>
              <Label>{t("secFieldDuration")}</Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={durationMin}
                onChange={(event) => setDurationMin(event.target.value)}
                placeholder={selected?.timeLimitMin ? String(selected.timeLimitMin) : "—"}
              />
              <p className="mt-1 text-xs text-slate-500">{t("secFieldDurationHint")}</p>
            </div>
            <div>
              <Label>{t("secFieldMaxWarnings")}</Label>
              <Input
                type="number"
                min={1}
                max={MAX_WARNINGS_LIMIT}
                value={maxWarnings}
                onChange={(event) => setMaxWarnings(Number(event.target.value) || DEFAULT_MAX_WARNINGS)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>{t("secFieldLimitAction")}</Label>
              <Select
                value={limitAction}
                onChange={(event) =>
                  setLimitAction(event.target.value === "WARN" ? "WARN" : "TERMINATE")
                }
              >
                <option value="TERMINATE">{t("secLimitTerminate")}</option>
                <option value="WARN">{t("secLimitWarn")}</option>
              </Select>
            </div>
            <div className="grid gap-2.5 md:col-span-2 md:grid-cols-2">
              <Toggle label={t("secFieldFullscreen")} checked={requireFullscreen} onChange={setRequireFullscreen} />
              <Toggle label={t("secFieldBlockCopy")} checked={blockCopy} onChange={setBlockCopy} />
              <Toggle label={t("secFieldWebcam")} checked={webcamEnabled} onChange={setWebcamEnabled} />
              <Toggle
                label={t("secFieldClient")}
                hint={t("secFieldClientHint")}
                checked={requireClient}
                onChange={setRequireClient}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => void submitAdvanced()} disabled={busy !== null}>
              {busy === "advanced" ? t("secCreating") : t("secCreateSubmit")}
            </Button>
            <Button variant="ghost" onClick={() => setAdvanced(false)} disabled={busy !== null}>
              {t("secAdvancedClose")}
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </Card>
  );
}
