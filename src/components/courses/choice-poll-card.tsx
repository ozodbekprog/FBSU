"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/api";

type Poll = {
  id: string;
  question: string;
  options: string[];
  isMultiple: boolean;
  isAnonymous: boolean;
  counts: number[];
  totalVotes: number;
  myVotes: number[];
  canManage: boolean;
};

type ListResponse = { ok?: boolean; error?: string; data?: Poll[] } | null;
type CreateResponse = { ok?: boolean; error?: string; data?: { id: string } } | null;

function percent(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

function PollCard({
  poll,
  onVoted,
}: {
  poll: Poll;
  onVoted: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(poll.myVotes);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = poll.myVotes.length > 0;
  const showResults = hasVoted || poll.canManage;

  function toggle(index: number) {
    setSelected((current) => {
      if (!poll.isMultiple) return current.includes(index) ? [] : [index];
      return current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index];
    });
  }

  async function onVote() {
    if (selected.length === 0) {
      setError("Avval variantni tanlang");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/choice/${poll.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionIndexes: selected }),
      });
      const json = (await res.json().catch(() => null)) as CreateResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Ovoz berishda xatolik yuz berdi");
        return;
      }
      onVoted();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{poll.question}</p>
        <div className="flex shrink-0 gap-1.5">
          {poll.isMultiple ? <Badge tone="blue">Ko'p tanlov</Badge> : null}
          {poll.isAnonymous ? <Badge tone="slate">Anonim</Badge> : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {poll.options.map((option, index) => {
          const count = poll.counts[index] ?? 0;
          const share = percent(count, poll.totalVotes);
          const mine = poll.myVotes.includes(index);
          return (
            <div key={`${poll.id}-${index}`}>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input
                  type={poll.isMultiple ? "checkbox" : "radio"}
                  name={`poll-${poll.id}`}
                  className="mt-0.5 h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  checked={selected.includes(index)}
                  disabled={sending}
                  onChange={() => toggle(index)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="break-words">{option}</span>
                    {mine ? <Badge tone="green">Sizning tanlov</Badge> : null}
                  </span>
                  {showResults ? (
                    <span className="mt-1 block">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-brand-500"
                          style={{ width: `${share}%` }}
                        />
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {count} ta ovoz · {share}%
                      </span>
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">Jami ovozlar: {poll.totalVotes}</span>
        {!hasVoted ? (
          <Button size="sm" onClick={onVote} disabled={sending || selected.length === 0}>
            {sending ? "Yuborilmoqda..." : "Ovoz berish"}
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export function ChoicePollCard({
  courseId,
  canManage,
}: {
  courseId: string;
  canManage: boolean;
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionRows, setOptionRows] = useState<string[]>(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/courses/${courseId}/choice`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ListResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "So'rovnomalarni yuklashda xatolik yuz berdi");
        return;
      }
      setPolls(json.data ?? []);
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setQuestion("");
    setOptionRows(["", ""]);
    setIsMultiple(false);
    setIsAnonymous(false);
    setShowForm(false);
  }

  async function onCreate() {
    const options = optionRows.map((option) => option.trim()).filter((option) => option.length > 0);
    if (!question.trim() || options.length < 2) {
      setError("Savol va kamida 2 ta variant kiritilishi shart");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/courses/${courseId}/choice`, {
        method: "POST",
        body: JSON.stringify({ question: question.trim(), options, isMultiple, isAnonymous }),
      });
      const json = (await res.json().catch(() => null)) as CreateResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "So'rovnoma yaratishda xatolik yuz berdi");
        return;
      }
      resetForm();
      await load();
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="So'rovnomalar"
        subtitle="Kurs bo'yicha fikr so'rash"
        action={
          canManage ? (
            <Button size="sm" variant="secondary" onClick={() => setShowForm((value) => !value)}>
              {showForm ? "Yopish" : "Yangi so'rovnoma"}
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {canManage && showForm ? (
          <div className="space-y-3 rounded-xl border border-slate-200/70 p-4">
            <div>
              <Label htmlFor="choice-question">Savol</Label>
              <Input
                id="choice-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Masalan: Qaysi mavzu qiyinroq bo'ldi?"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label>Variantlar</Label>
              {optionRows.map((option, index) => (
                <Input
                  key={`option-${index}`}
                  value={option}
                  onChange={(event) =>
                    setOptionRows((current) =>
                      current.map((value, position) => (position === index ? event.target.value : value)),
                    )
                  }
                  placeholder={`${index + 1}-variant`}
                  disabled={creating}
                />
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOptionRows((current) => [...current, ""])}
                  disabled={creating || optionRows.length >= 10}
                >
                  Variant qo'shish
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setOptionRows((current) =>
                      current.length > 2 ? current.slice(0, -1) : current,
                    )
                  }
                  disabled={creating || optionRows.length <= 2}
                >
                  Oxirgisini o'chirish
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  checked={isMultiple}
                  disabled={creating}
                  onChange={(event) => setIsMultiple(event.target.checked)}
                />
                <span>Bir nechta variant tanlash mumkin</span>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30"
                  checked={isAnonymous}
                  disabled={creating}
                  onChange={(event) => setIsAnonymous(event.target.checked)}
                />
                <span>Anonim so'rovnoma (kim ovoz bergani ko'rinmaydi)</span>
              </label>
            </div>
            <Button size="sm" onClick={onCreate} disabled={creating}>
              {creating ? "Yaratilmoqda..." : "So'rovnoma yaratish"}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Yuklanmoqda...</p>
        ) : polls.length === 0 ? (
          <p className="text-sm text-slate-500">Hozircha so'rovnoma yo'q.</p>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onVoted={() => void load()} />
            ))}
          </div>
        )}

        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </CardBody>
    </Card>
  );
}
