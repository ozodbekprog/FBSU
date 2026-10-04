"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";

export type BonusCourse = { id: string; title: string };
export type BonusStudent = { id: string; name: string; groupName: string | null };

type Props = {
  courses: BonusCourse[];
  students: BonusStudent[];
};

/** Slayder 6..40 (0.6..4.0 ball), API ga butun son sifatida yuboriladi. */
const TENTHS_MIN = 6;
const TENTHS_MAX = 40;

export function BonusAwardForm({ courses, students }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [tenths, setTenths] = useState(6);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const disabled = !courseId || !studentId || reason.trim().length < 3 || pending;

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [students, studentId],
  );

  async function submit() {
    if (disabled) return;
    setMessage(null);
    try {
      const response = await fetch("/api/bonus-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentId, tenths, reason: reason.trim() }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; data?: unknown };

      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? "Xatolik yuz berdi" });
        return;
      }

      setMessage({
        tone: "ok",
        text: `${selectedStudent?.name ?? "O'quvchi"} uchun +${(tenths / 10).toFixed(1)} ball berildi`,
      });
      setReason("");
    } catch {
      setMessage({ tone: "error", text: "Serverga ulanib bo'lmadi" });
    }
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader title="Bonus ball berish" subtitle="Sizga birorta fan biriktirilmagan" />
        <CardBody>
          <p className="text-sm text-slate-400">
            Bonus ball berish uchun avval sizga fan biriktirilishi kerak.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Bonus ball berish"
        subtitle={`${(tenths / 10).toFixed(1)} ball · faqat o&apos;z fangizdan`}
      />
      <CardBody>
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Fan</span>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">O&apos;quvchi</span>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.groupName ? ` — ${student.groupName}` : ""}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">
              Ball: <span className="text-brand-700">+{(tenths / 10).toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={TENTHS_MIN}
              max={TENTHS_MAX}
              step={1}
              value={tenths}
              onChange={(e) => setTenths(Number(e.target.value))}
              className="w-full accent-blue-500"
              aria-label="Bonus ball 0.6 dan 4.0 gacha"
            />
            <span className="text-xs text-slate-600">0.6 dan 4.0 gacha</span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">Sabab</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masalan: dasturiy topshiriqni ajoyib bajarildi"
              maxLength={300}
            />
          </label>

          <Button disabled={disabled} onClick={() => startTransition(submit)}>
            Bonus berish
          </Button>

          {message ? (
            <p
              className={
                message.tone === "ok" ? "text-sm text-emerald-400" : "text-sm text-rose-400"
              }
              role="status"
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}