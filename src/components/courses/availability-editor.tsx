"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";

type TargetType = "ASSIGNMENT" | "QUIZ";

type Rule = {
  id: string;
  availableFrom: string | null;
  availableTo: string | null;
};

type RuleResponse = {
  ok?: boolean;
  error?: string;
  data?: { rule: Rule | null };
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
  data?: Rule | null;
};

function pad(part: number) {
  return String(part).padStart(2, "0");
}

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AvailabilityEditor({
  targetType,
  targetId,
}: {
  targetType: TargetType;
  targetId: string;
}) {
  const [rule, setRule] = useState<Rule | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/course-rules?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
      );
      const json = (await res.json().catch(() => null)) as RuleResponse | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Qoidani yuklab bo'lmadi");
        return;
      }
      const current = json.data?.rule ?? null;
      setRule(current);
      setFrom(toLocalInput(current?.availableFrom ?? null));
      setTo(toLocalInput(current?.availableTo ?? null));
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function onSave() {
    setError(null);
    setMessage(null);
    if (!from && !to) {
      setError("Kamida bitta vaqt kiriting");
      return;
    }
    const availableFrom = toIso(from);
    const availableTo = toIso(to);
    if ((from && !availableFrom) || (to && !availableTo)) {
      setError("Sana formati xato");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/course-rules", {
        method: "POST",
        body: JSON.stringify({ targetType, targetId, availableFrom, availableTo }),
      });
      const json = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? "Saqlashda xatolik yuz berdi");
        return;
      }
      setRule(json.data);
      setFrom(toLocalInput(json.data.availableFrom));
      setTo(toLocalInput(json.data.availableTo));
      setMessage("Vaqt saqlandi");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (!rule) return;
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/api/course-rules/${rule.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Tozalashda xatolik yuz berdi");
        return;
      }
      setRule(null);
      setFrom("");
      setTo("");
      setMessage("Vaqt cheklovi olib tashlandi");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  const status = rule
    ? [
        rule.availableFrom ? `Ochiladi: ${fmtDateTime(rule.availableFrom)}` : null,
        rule.availableTo ? `Yopiladi: ${fmtDateTime(rule.availableTo)}` : null,
      ]
        .filter(Boolean)
        .join(" / ")
    : "Har doim ochiq";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{loading ? "Yuklanmoqda..." : status || "Har doim ochiq"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="availability-from">Boshlanish</Label>
          <Input
            id="availability-from"
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            disabled={loading || busy}
          />
        </div>
        <div>
          <Label htmlFor="availability-to">Tugash</Label>
          <Input
            id="availability-to"
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            disabled={loading || busy}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void onSave()} disabled={loading || busy}>
          {busy ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        {rule ? (
          <Button variant="secondary" onClick={() => void onClear()} disabled={busy}>
            Tozalash
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
    </div>
  );
}
