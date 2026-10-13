"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
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
  awardedBy: { id: string; name: string };
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

const CATEGORIES = [
  { value: "davomat", label: "Davamat", icon: "📅", tint: "from-sky-500 to-blue-600" },
  { value: "faollik", label: "Darsdagi faollik", icon: "⚡", tint: "from-amber-400 to-orange-500" },
  { value: "aloqadirilish", label: "Aloqadirilish", icon: "🤝", tint: "from-violet-500 to-purple-600" },
  { value: "homework", label: "Vazifalar", icon: "📚", tint: "from-emerald-400 to-teal-600" },
  { value: "test", label: "Testlar", icon: "🎯", tint: "from-rose-400 to-pink-600" },
];

export function TeacherPointsList({ courses, teacherRole }: Props) {
  const { t } = useI18n();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [points, setPoints] = useState<TeacherPoint[]>([]);
  const [newPoints, setNewPoints] = useState(1);
  const [category, setCategory] = useState("davomat");
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
        text: t("tchBonusAwarded", {
          name: payload.data?.student.name ?? activeStudent.name,
          points: String(payload.data?.points ?? 0),
        }),
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center"
      >
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
          🎓
        </div>
        <h3 className="text-base font-semibold text-slate-800">{t("tchNoSubjectAssigned")}</h3>
        <p className="mt-1 text-sm text-slate-400">{t("tchNoSubjectAssignedDesc")}</p>
      </motion.div>
    );
  }

  const activeCategory = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const percent = Math.min((totalPoints / MAX_POINTS) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-700 p-6 text-white shadow-xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-52 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              {t("tchPointsTitle")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{t("tchGivePoints")}</h2>
            <p className="mt-1 max-w-md text-sm text-white/70">
              {selectedCourse?.title ?? t("tchNoSubjectAssignedDesc")}
            </p>
          </div>

          <div className="relative grid size-20 shrink-0 place-items-center">
            <motion.span
              key={totalPoints}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="absolute text-2xl font-bold"
            >
              {totalPoints.toFixed(1)}
            </motion.span>
            <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
              <motion.circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="url(#tchGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={97.4}
                initial={{ strokeDashoffset: 97.4 }}
                animate={{ strokeDashoffset: 97.4 - (97.4 * percent) / 100 }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
              />
              <defs>
                <linearGradient id="tchGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-400 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ type: "spring", stiffness: 70, damping: 18 }}
          />
        </div>
        <p className="relative mt-2 text-xs text-white/60">
          {t("tchMaxPoints", { max: String(MAX_POINTS) })}: {totalPoints.toFixed(1)} / {MAX_POINTS}
        </p>
      </motion.div>

      {/* ── Kurs tanlash ─────────────────────────────────────────────── */}
      <motion.label
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid gap-1.5"
      >
        <span className="text-sm font-medium text-slate-700">{t("tchSubject")}</span>
        <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </Select>
      </motion.label>

      {/* ── Davamat balli sozlamalari ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-lg">📅</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Davamat balli</h3>
            <p className="text-xs text-slate-400">
              Har bir sinf uchun alohida belgilang — darsga kelgan talaba shuncha ball oladi
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Har bir sinf */}
          {groups.length === 0 ? (
            <p className="text-sm text-slate-400">Bu kursga yozilgan sinf topilmadi.</p>
          ) : (
            groups.map((group) => {
              const key = group.id;
              const value = drafts[key] ?? 1;
              const saving = savingGroup === key;
              return (
                <motion.div
                  key={group.id}
                  layout
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">{group.name}</span>
                    <div className="flex items-center gap-2">
                      <motion.span
                        key={value}
                        initial={{ scale: 1.25, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.18 }}
                        className="text-lg font-bold text-sky-600"
                      >
                        +{Number(value).toFixed(1)}
                      </motion.span>
                      <Button
                        onClick={() => saveAttendance(key, group.id, value)}
                        disabled={saving || pending}
                        className="!px-3 !py-1.5 !text-xs !bg-sky-600 hover:!bg-sky-700"
                      >
                        {saving ? "…" : "Saqlash"}
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
                    aria-label={`${group.name} davamat balli`}
                    className="mt-2 w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>0.1</span>
                    <span>7.5</span>
                    <span>15</span>
                  </div>
                  <AnimatePresence>
                    {savedGroup === key ? (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-1 text-xs font-medium text-emerald-600"
                      >
                        ✓ Saqlandi
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}

          {/* Boshqa/umumiy qiymat */}
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-slate-700">Boshqa hollarda</span>
                <p className="text-[11px] text-slate-400">Sinfsiz kelganlar uchun</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-600">
                  +{Number(drafts.__all__ ?? 1).toFixed(1)}
                </span>
                <Button
                  onClick={() => saveAttendance("__all__", null, drafts.__all__ ?? 1)}
                  disabled={!!savingGroup || pending}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  {savingGroup === "__all__" ? "…" : "Saqlash"}
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
              aria-label="Sinfsiz davamat balli"
              className="mt-2 w-full accent-slate-400"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Ball berish paneli ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div className={`bg-gradient-to-r ${activeCategory.tint} px-5 py-3 text-white`}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Kategoriya</p>
          <p className="mt-0.5 text-base font-semibold">
            {activeCategory.icon} {activeCategory.label}
          </p>
        </div>

        <div className="grid gap-4 p-5">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("tchPupil")}</span>
            <Select value={activeStudent?.id ?? ""} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.groupName ? ` — ${student.groupName}` : ""}
                </option>
              ))}
            </Select>
          </label>

          {/* Kategoriya tanlash */}
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("tchCategory")}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CATEGORIES.map((cat) => {
                const active = cat.value === category;
                return (
                  <motion.button
                    key={cat.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCategory(cat.value)}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${
                      active
                        ? "border-transparent bg-gradient-to-br text-white shadow-md " + cat.tint
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-center leading-tight">{cat.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Ball slider */}
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-700">{t("tchScoreLabelColon")}</span>
              <motion.span
                key={newPoints}
                initial={{ scale: 1.25, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="text-xl font-bold text-brand-700"
              >
                +{newPoints.toFixed(1)}
              </motion.span>
            </div>
            <input
              type="range"
              min={0.1}
              max={15}
              step={0.1}
              value={newPoints}
              onChange={(e) => setNewPoints(Number(e.target.value))}
              aria-label={t("tchScoreLabelColon")}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>0.1</span>
              <span>15</span>
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-slate-700">{t("tchReason")}</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("tchReasonPlaceholder")}
              maxLength={300}
            />
          </label>

          <Button
            disabled={disabled}
            onClick={() => startTransition(submit)}
            className={`!bg-gradient-to-r ${activeCategory.tint} text-white`}
          >
            {t("tchGivePointsAction")}
          </Button>

          <AnimatePresence mode="popLayout">
            {message ? (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                role="status"
                className={
                  message.tone === "ok"
                    ? "rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                    : "rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                }
              >
                {message.tone === "ok" ? "🎉 " : "⚠️ "}
                {message.text}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Tarix ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {points.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Berilgan balllar ({points.length})
            </h3>
            <div className="space-y-2">
              {points.map((p, i) => {
                const cat = CATEGORIES.find((c) => c.value === p.category);
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">
                      {cat?.icon ?? "⭐"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {cat?.label ?? p.category}
                      </p>
                      {p.reason ? (
                        <p className="truncate text-xs text-slate-400">{p.reason}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-brand-700">
                      +{p.points.toFixed(1)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}