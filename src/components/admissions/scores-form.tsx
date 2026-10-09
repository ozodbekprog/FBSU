"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/components/i18n/LocaleProvider";

type Scores = {
  examScore1: number | null;
  examScore2: number | null;
  interviewScore: number | null;
  decisionNote: string | null;
};

type Labels = {
  score1: string;
  score2: string;
  interview: string;
  total: string;
  decisionNote: string;
  save: string;
  saved: string;
};

function parseScore(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function ScoresForm({
  applicationId,
  initial,
  labels,
}: {
  applicationId: string;
  initial: Scores;
  labels: Labels;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [score1, setScore1] = useState(initial.examScore1?.toString() ?? "");
  const [score2, setScore2] = useState(initial.examScore2?.toString() ?? "");
  const [interview, setInterview] = useState(initial.interviewScore?.toString() ?? "");
  const [decisionNote, setDecisionNote] = useState(initial.decisionNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const total = (parseScore(score1) ?? 0) + (parseScore(score2) ?? 0);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch(`/api/admissions/${applicationId}`, {
        method: "PATCH",
        body: JSON.stringify({
          examScore1: parseScore(score1),
          examScore2: parseScore(score2),
          interviewScore: parseScore(interview),
          decisionNote: decisionNote.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("commonError"));
        return;
      }
      setNotice(labels.saved);
      router.refresh();
    } catch {
      setError(t("commonNetworkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>{labels.score1}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={score1}
            onChange={(event) => setScore1(event.target.value)}
            placeholder="0-100"
          />
        </div>
        <div>
          <Label>{labels.score2}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={score2}
            onChange={(event) => setScore2(event.target.value)}
            placeholder="0-100"
          />
        </div>
        <div>
          <Label>{labels.interview}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={interview}
            onChange={(event) => setInterview(event.target.value)}
            placeholder="0-100"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{labels.total}:</span>
        <span className="font-semibold tabular-nums text-brand-950">{total}/200</span>
      </div>
      <div>
        <Label>{labels.decisionNote}</Label>
        <Textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          rows={3}
          maxLength={1000}
        />
      </div>
      {error ? (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700">{notice}</p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {labels.save}
      </Button>
    </form>
  );
}
