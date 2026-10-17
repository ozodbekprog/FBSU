"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { Button, Card, CardBody, CardHeader, Input, Label, Select } from "@/components/ui";
import { useI18n } from "@/components/i18n/LocaleProvider";

type TeacherPoint = {
  id: string;
  courseId: string;
  studentId: string;
  points: number;
  category: string;
  reason: string;
  createdAt: string;
  course: { id: string; title: string };
  student: { id: string; name: string };
  awardedBy?: { id: string; name: string } | null;
};

type AttendanceConfig = {
  id: string;
  courseId: string;
  groupId: string | null;
  points: number;
  course: { id: string; title: string; slug: string };
  group: { id: string; name: string } | null;
};

type CourseOption = {
  id: string;
  title: string;
  students: { id: string; name: string; groupId: string | null; groupName: string | null }[];
  groups: { id: string; name: string }[];
};

type Props = {
  courses: CourseOption[];
  teacherRole: string;
};

const MAX_POINTS = 15;

type IconProps = { className?: string };

/** FBSU uslubidagi inline ikonka: 24x24, currentColor, strokeWidth 1.8. */
function Icon({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Kalendar — davomat. */
const IconAttendance = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
    <path d="m9 14.5 2 2 4-4" />
  </Icon>
);

/** Yug'ruch — darsdagi faollik. */
const IconActivity = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
  </Icon>
);

/** Qo'l — aloqadirilish. */
const IconHandshake = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m11 17 2 2a1.5 1.5 0 0 0 2.1 0l3.1-3.1a1.5 1.5 0 0 0 0-2.1L14 9.6" />
    <path d="M6.8 14.8 4.7 12.7a1.5 1.5 0 0 1 0-2.1L7.8 7.5a2 2 0 0 1 1.6-.8H12a2 2 0 0 1 1.6.8l3.1 3.1" />
    <path d="M8.5 12.5 11 15a1.5 1.5 0 0 0 2.1 0" />
  </Icon>
);

/** Kitob — vazifalar. */
const IconBook = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    <path d="M9 7h7M9 11h5" />
  </Icon>
);

/** Nishon — testlar. */
const IconTarget = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Icon>
);

/** Reytting yulduzi — kategoriya noma'lum bo'lsa. */
const IconStar = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
  </Icon>
);

/** Oqituvchi kepka — fan yo'q holati. */
const IconCap = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m2.5 9 9.5-5 9.5 5-9.5 5L2.5 9Z" />
    <path d="M6.5 11.5V17c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5.5" />
  </Icon>
);

/** Qalqon tekshiruvi — muvaffaqiyat. */
const IconCheck = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);

/** Ogohlantirish — xato. */
const IconAlert = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M10.3 3.9 2.4 17.4A2 2 0 0 0 4.1 20.4h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
);

const CATEGORIES = [
  { value: "faollik", label: "Faollik", Icon: IconActivity },
  { value: "aloqadirilish", label: "Aloqadirilish", Icon: IconHandshake },
  { value: "homework", label: "Vazifalar", Icon: IconBook },
  { value: "test", label: "Testlar", Icon: IconTarget },
];

export function TeacherPointsList({ courses, teacherRole }: Props) {
  const { t } = useI18n();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [points, setPoints] = useState<TeacherPoint[]>([]);
  const [newPoints, setNewPoints] = useState(1);
  const [category, setCategory] = useState("faollik");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Davamat sozlamalari — kurs/sinf bo'yicha.
  const [attendanceConfigs, setAttendanceConfigs] = useState<AttendanceConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [savedGroup, setSavedGroup] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );

  const students = selectedCourse?.students ?? [];
  const groups = selectedCourse?.groups ?? [];

  const [studentId, setStudentId] = useState("");

  // Kurs almashganda talaba tanlovini tozalaymiz (birinchi talaba).
  useEffect(() => {
    setStudentId(students[0]?.id ?? "");
  }, [students]);

  const loadPoints = useCallback(async () => {
    const id = studentId || students[0]?.id || "";
    if (!courseId || !id) {
      setPoints([]);
      return;
    }
    try {
      const res = await fetch(`/api/teacher-points?courseId=${courseId}&studentId=${id}`);
      const data = await res.json();
      if (data.ok) setPoints(data.data ?? []);
    } catch {
      setPoints([]);
    }
  }, [courseId, studentId, students]);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance-points");
      const data = await res.json();
      if (data.ok) {
        setAttendanceConfigs(data.data ?? []);
      }
    } catch {
      // jimgina
    }
  }, []);

  useEffect(() => {
    void loadPoints();
    void loadConfigs();
  }, [loadPoints, loadConfigs]);

  // Kurs almashganda draft qiymatlari yangi kursdan olinadi.
  useEffect(() => {
    if (!courseId) return;
    const next: Record<string, number> = {};
    for (const group of groups) {
      const found = attendanceConfigs.find((c) => c.courseId === courseId && c.groupId === group.id);
      next[group.id] = found?.points ?? 1;
    }
    const fallback = attendanceConfigs.find((c) => c.courseId === courseId && c.groupId === null);
    next["__all__"] = fallback?.points ?? 1;
    setDrafts(next);
    setSavedGroup(null);
  }, [courseId, groups, attendanceConfigs]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? students[0] ?? null,
    [students, studentId],
  );

  const totalPoints = useMemo(
    () => points.reduce((sum, p) => sum + p.points, 0),
    [points],
  );

  const disabled = !courseId || !activeStudent || pending;

  async function submit() {
    if (!activeStudent) return;
    setMessage(null);
    try {
      const response = await fetch("/api/teacher-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          studentId: activeStudent.id,
          points: newPoints,
          category,
          reason: reason.trim(),
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        data?: TeacherPoint;
      };

      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? t("tchErrorOccurred") });
        return;
      }

      setMessage({
        tone: "ok",
        text: t("tchBonusAwarded")
          .replace("{name}", payload.data?.student.name ?? activeStudent.name)
          .replace("{points}", String(payload.data?.points ?? 0)),
      });
      await loadPoints();
      setReason("");
    } catch {
      setMessage({ tone: "error", text: t("tchServerError") });
    }
  }

  async function saveAttendance(key: string, groupId: string | null, value: number) {
    setSavingGroup(key);
    setSavedGroup(null);
    try {
      const response = await fetch("/api/attendance-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, groupId, points: value }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setMessage({ tone: "error", text: payload.error ?? t("tchErrorOccurred") });
      } else {
        setSavedGroup(key);
        await loadConfigs();
      }
    } catch {
      setMessage({ tone: "error", text: t("tchServerError") });
    } finally {
      setSavingGroup(null);
    }
  }


  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader title={t("tchNoSubjectAssigned")} subtitle={t("tchNoSubjectAssignedDesc")} />
        <CardBody>
          <p className="text-sm text-slate-500">{t("tchNoSubjectAssignedDesc")}</p>
        </CardBody>
      </Card>
    );
  }

  const activeCategory = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const CategoryIcon = activeCategory.Icon;
  const percent = Math.min((totalPoints / MAX_POINTS) * 100, 100);

  return (
    <div className="space-y-5">
      {/* ── Kurs ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("tchSubject")}
          subtitle={selectedCourse ? `${students.length} ${t("tchStudents")}` : undefined}
        />
        <CardBody className="pt-5">
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {/* ── Davamat balli ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("tchAttendanceTitle")}
          subtitle={t("tchAttendanceSubtitle")}
          action={
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <IconAttendance className="size-[18px]" />
            </span>
          }
        />
        <CardBody className="space-y-4 pt-5">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500">{t("tchNoGroups")}</p>
          ) : (
            groups.map((group) => {
              const key = group.id;
              const value = drafts[key] ?? 1;
              const saving = savingGroup === key;
              const saved = savedGroup === key;
              return (
                <div key={group.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{group.name}</span>
                    <div className="flex items-center gap-2.5">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={value}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="font-semibold tabular-nums text-brand-700"
                        >
                          +{Number(value).toFixed(1)}
                        </motion.span>
                      </AnimatePresence>
                      <Button
                        variant={saved ? "gold" : "secondary"}
                        size="sm"
                        onClick={() => saveAttendance(key, group.id, value)}
                        disabled={saving || pending}
                      >
                        {saving ? "…" : saved ? "Saqlandi" : t("tchSave")}
                      </Button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={15}
                    step={0.1}
                    value={value}
                    onChange={(e) => {
                      setDrafts((prev) => ({ ...prev, [key]: Number(e.target.value) }));
                      setSavedGroup(null);
                    }}
                    aria-label={`${group.name} — ${t("tchAttendanceTitle")}`}
                    className="mt-3 w-full accent-brand-600"
                  />
                </div>
              );
            })
          )}

          <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{t("tchNoGroupTitle")}</p>
                <p className="text-xs text-slate-500">{t("tchNoGroupSubtitle")}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-semibold tabular-nums text-slate-700">
                  +{Number(drafts.__all__ ?? 1).toFixed(1)}
                </span>
                <Button
                  variant={savedGroup === "__all__" ? "gold" : "secondary"}
                  size="sm"
                  onClick={() => saveAttendance("__all__", null, drafts.__all__ ?? 1)}
                  disabled={!!savingGroup || pending}
                >
                  {savingGroup === "__all__" ? "…" : savedGroup === "__all__" ? "Saqlandi" : t("tchSave")}
                </Button>
              </div>
            </div>
            <input
              type="range"
              min={0.1}
              max={15}
              step={0.1}
              value={drafts.__all__ ?? 1}
              onChange={(e) => {
                setDrafts((prev) => ({ ...prev, __all__: Number(e.target.value) }));
                setSavedGroup(null);
              }}
              aria-label={t("tchNoGroupTitle")}
              className="mt-3 w-full accent-slate-400"
            />
          </div>
        </CardBody>
      </Card>

      {/* ── Ball berish ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("tchGivePoints")}
          subtitle={t("tchGivePointsSubtitle")}
          action={
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CategoryIcon className="size-[18px]" />
            </span>
          }
        />
        <CardBody className="space-y-5 pt-5">
          {/* Talaba */}
          <div>
            <Label>{t("tchPupil")}</Label>
            <Select value={activeStudent?.id ?? ""} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.groupName ? ` — ${student.groupName}` : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* Kategoriya */}
          <div>
            <Label>{t("tchCategory")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((cat) => {
                const active = cat.value === category;
                const CatIcon = cat.Icon;
                return (
                  <motion.button
                    key={cat.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setCategory(cat.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-brand-900 bg-brand-900 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CatIcon className="size-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Ball */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <Label className="mb-0">{t("tchScoreLabelColon")}</Label>
              <span className="text-sm font-semibold tabular-nums text-brand-700">
                +{newPoints.toFixed(1)} / {MAX_POINTS.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={15}
              step={0.1}
              value={newPoints}
              onChange={(e) => setNewPoints(Number(e.target.value))}
              aria-label={t("tchScoreLabelColon")}
              className="w-full accent-brand-600"
            />
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-brand-900"
                  initial={false}
                  animate={{ width: `${(newPoints / MAX_POINTS) * 100}%` }}
                  transition={{ type: "spring", stiffness: 180, damping: 24 }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {t("tchTotalForStudent")}:{" "}
                <span className="font-medium tabular-nums text-slate-800">
                  {(totalPoints + newPoints).toFixed(1)} / {MAX_POINTS.toFixed(1)}
                </span>
              </p>
            </div>
          </div>

          {/* Sabab */}
          <div>
            <Label>{t("tchReason")}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("tchReasonPlaceholder")}
              maxLength={300}
            />
          </div>

          <Button
            disabled={disabled}
            onClick={() => startTransition(submit)}
            className="w-full"
          >
            {t("tchGivePointsAction")}
          </Button>

          <AnimatePresence mode="popLayout">
            {message ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="status"
                className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                  message.tone === "ok"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {message.tone === "ok" ? (
                  <IconCheck className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <IconAlert className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </CardBody>
      </Card>

      {/* ── Tarix ────────────────────────────────────────────────────── */}
      {points.length > 0 ? (
        <Card>
          <CardHeader
            title={t("tchHistory")}
            subtitle={`${points.length} ${t("tchHistorySubtitle")}`}
          />
          <CardBody className="pt-5">
            <ul className="divide-y divide-slate-100">
              {points.map((p, i) => {
                const cat = CATEGORIES.find((c) => c.value === p.category);
                const CatIcon = cat?.Icon ?? IconStar;
                return (
                  <motion.li
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <CatIcon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {cat?.label ?? p.category}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {p.reason || p.awardedBy?.name || ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">
                      +{p.points.toFixed(1)}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
