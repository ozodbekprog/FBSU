"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/utils";

type Student = { id: string; name: string };

type Extension = { id: string; studentId: string; extendedDueAt: string };

type LoadResponse = {
  ok?: boolean;
  error?: string;
  data?: { students: Student[]; extensions: Extension[] };
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
  data?: Extension;
};

type DeleteResponse = {
  ok?: boolean;
  error?: string;
};

function pad(part: number) {
  return String(part).padStart(2, "0");
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function AssignmentExtensions({ assignmentId }: { assignmentId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [studentId, setStudentId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/assignments/${assignmentId}/extensions`);
      const json = (await res.json().catch(() => null)) as LoadResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? "Ma'lumotlarni yuklab bo'lmadi");
        return;
      }
      setStudents(json.data.students);
      setExtensions(json.data.extensions);
      setStudentId((current) => current || json.data?.students[0]?.id || "");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function onSave() {
    setError(null);
    setMessage(null);
    if (!studentId) {
      setError("Talabani tanlang");
      return;
    }
    const iso = toIso(dueAt);
    if (!iso) {
      setError("Yangi muddatni kiriting");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/api/assignments/${assignmentId}/extensions`, {
        method: "POST",
        body: JSON.stringify({ studentId, extendedDueAt: iso }),
      });
      const json = (await res.json().catch(() => null)) as SaveResponse | null;
      if (!res.ok || !json?.ok || !json.data) {
        setError(json?.error ?? "Saqlashda xatolik yuz berdi");
        return;
      }
      const saved = json.data;
      setExtensions((current) => [
        ...current.filter((item) => item.studentId !== saved.studentId),
        saved,
      ]);
      setDueAt("");
      setMessage("Muddat uzaytirildi");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(targetId: string) {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await apiFetch(
        `/api/assignments/${assignmentId}/extensions?studentId=${encodeURIComponent(targetId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as DeleteResponse | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "O'chirishda xatolik yuz berdi");
        return;
      }
      setExtensions((current) => current.filter((item) => item.studentId !== targetId));
      setMessage("Uzaytirish olib tashlandi");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }

  function nameOf(id: string) {
    return students.find((student) => student.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="extension-student">Talaba</Label>
          <Select
            id="extension-student"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            disabled={loading || busy || students.length === 0}
          >
            {students.length === 0 ? <option value="">Talaba yo&apos;q</option> : null}
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="extension-due">Yangi muddat</Label>
          <Input
            id="extension-due"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={loading || busy}
          />
        </div>
      </div>
      <Button onClick={() => void onSave()} disabled={loading || busy || students.length === 0}>
        {busy ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Uzaytirilgan muddatlar</p>
        {loading ? (
          <p className="text-sm text-slate-600">Yuklanmoqda...</p>
        ) : extensions.length === 0 ? (
          <p className="text-sm text-slate-600">Hozircha uzaytirish yo&apos;q</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/70">
            {extensions.map((extension) => (
              <li
                key={extension.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {nameOf(extension.studentId)}
                  </p>
                  <p className="text-xs text-slate-500">{fmtDateTime(extension.extendedDueAt)}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onDelete(extension.studentId)}
                  disabled={busy}
                >
                  O&apos;chirish
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
