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

export function CreateForm({ quizzes }: { quizzes: QuizOption[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [quizId, setQuizId] = useState(quizzes[0]?.id ?? "");
  const [title, setTitle] = useState("");
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
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = quizzes.find((quiz) => quiz.id === quizId) ?? null;

  async function submit() {
    if (busy) return;
    if (!quizId) {
      setError(t("secPickQuiz"));
      return;
    }
    setBusy(true);
    setError(null);
    const duration = durationMin.trim() === "" ? null : Number(durationMin);
    const result = await apiFetch<{ id: string; code: string }>(
      "/api/secure-exams",
      "POST",
      {
        quizId,
        title: title.trim() === "" ? (selected ? selected.title : "") : title.trim(),
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
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setCreated(result.data);
    setBusy(false);
    router.refresh();
  }

  async function copyCode() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (created) {
    return (
      <Card className="p-5">
        <p className="text-sm font-medium text-emerald-700">{t("secCreatedCode", { code: formatExamCode(created.code) })}</p>
        <p className="mt-3 font-mono text-3xl font-semibold tracking-[0.25em] text-brand-950">
          {formatExamCode(created.code)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copyCode()}>
            {copied ? t("secCopied") : t("secCopyCode")}
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>{t("secFieldQuiz")}</Label>
          <Select value={quizId} onChange={(event) => setQuizId(event.target.value)}>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.title} — {quiz.courseTitle}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>{t("secFieldTitle")}</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("secTitlePlaceholder")}
            maxLength={200}
          />
        </div>
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
            onChange={(event) => setLimitAction(event.target.value === "WARN" ? "WARN" : "TERMINATE")}
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
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4">
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? t("secCreating") : t("secCreateSubmit")}
        </Button>
      </div>
    </Card>
  );
}
