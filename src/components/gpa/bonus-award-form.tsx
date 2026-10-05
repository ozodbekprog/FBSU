"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, CardBody, CardHeader, Input, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

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
  const { t } = useI18n();
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
        setMessage({ tone: "error", text: payload.error ?? t("grdErrorOccurred") });
        return;
      }

      setMessage({
        tone: "ok",
        text: t("grdBonusAwarded", {
          name: selectedStudent?.name ?? t("grdPupil"),
          points: (tenths / 10).toFixed(1),
        }),
      });
      setReason("");
    } catch {
      setMessage({ tone: "error", text: t("grdServerError") });
    }
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader
          title={t("grdGiveBonus")}
          subtitle={t("grdNoSubjectAssigned")}
        />
        <CardBody>
          <p className="text-sm text-slate-400">{t("grdNoSubjectAssignedDesc")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("grdGiveBonus")}
        subtitle={t("grdBonusSubtitle", { points: (tenths / 10).toFixed(1) })}
      />
      <CardBody>
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("grdSubject")}</span>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </Select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("grdPupil")}</span>
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
              {t("grdScoreLabelColon")}{" "}
              <span className="text-brand-700">+{(tenths / 10).toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={TENTHS_MIN}
              max={TENTHS_MAX}
              step={1}
              value={tenths}
              onChange={(e) => setTenths(Number(e.target.value))}
              className="w-full accent-blue-500"
              aria-label={t("grdBonusRangeAria")}
            />
            <span className="text-xs text-slate-600">{t("grdBonusRange")}</span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("grdReason")}</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("grdReasonPlaceholder")}
              maxLength={300}
            />
          </label>

          <Button disabled={disabled} onClick={() => startTransition(submit)}>
            {t("grdGiveBonusAction")}
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