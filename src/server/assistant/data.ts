import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import { attendanceCounts, type AttendanceCounts } from "@/app/api/attendance/summary/data";

/** AI agent tool'lari uchun sof (DB'siz) mantiq — unit test qilinadi. */

export const WEEKDAYS_UZ = [
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
  "yakshanba",
] as const;

export const SLOT_TIMES: Record<number, string> = {
  1: "09:00-10:20",
  2: "10:30-11:50",
  3: "12:00-13:20",
  4: "14:20-15:40",
  5: "15:50-17:10",
  6: "17:20-18:40",
  7: "18:50-20:10",
  8: "20:20-21:40",
};

export const STATUS_UZ: Record<AttendanceStatus, string> = {
  PRESENT: "qatnashdi",
  LATE: "kechikdi",
  ABSENT: "kelmadi",
  EXCUSED: "sababli",
  SUSPICIOUS: "shubhali",
  LEFT_EARLY: "vaqtli ketdi",
};

/** JS getDay() (yakshanba=0) -> o'zbekcha hafta kuni raqami (dushanba=1... yakshanba=7). */
export function uzbekWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function weekdayLabel(day: number): string {
  return WEEKDAYS_UZ[((Math.round(day) - 1) % 7 + 7) % 7] ?? "";
}

/** Model yuborgan argumentni xavfsiz butun songa aylantiradi. */
export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, num));
}

export function clampDay(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const day = Math.round(value);
  return day >= 1 && day <= 7 ? day : null;
}

export type StudentRow = { id: string; name: string };
export type StudentAttendanceRow = StudentRow & AttendanceCounts;

/** Talabalar bo'yicha davomatni yig'adi; eng past foiz birinchi turadi. */
export function attendanceRowsByStudent(
  students: StudentRow[],
  records: { studentId: string; status: AttendanceStatus }[],
): StudentAttendanceRow[] {
  const byStudent = new Map<string, AttendanceStatus[]>();
  for (const record of records) {
    const list = byStudent.get(record.studentId);
    if (list) list.push(record.status);
    else byStudent.set(record.studentId, [record.status]);
  }
  return students
    .map((student) => ({ ...student, ...attendanceCounts(byStudent.get(student.id) ?? []) }))
    .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));
}

export type GradeInput = { studentId: string; percent: number };
export type StudentGradeRow = StudentRow & { percent: number; count: number; low: boolean };

export const GRADE_LOW_PERCENT = 60;

/** Talabalar bo'yicha o'rtacha baho foizini yig'adi; ma'lumoti yo'qlar oxirida. */
export function gradeRowsByStudent(students: StudentRow[], items: GradeInput[]): StudentGradeRow[] {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    if (!Number.isFinite(item.percent)) continue;
    const current = totals.get(item.studentId) ?? { sum: 0, count: 0 };
    current.sum += clampPercent(item.percent);
    current.count += 1;
    totals.set(item.studentId, current);
  }
  return students
    .map((student) => {
      const agg = totals.get(student.id);
      const hasData = Boolean(agg && agg.count > 0);
      const percent = hasData ? Math.round((agg as { sum: number }).sum / (agg as { count: number }).count) : -1;
      return {
        ...student,
        percent,
        count: agg?.count ?? 0,
        low: hasData && percent < GRADE_LOW_PERCENT,
      };
    })
    .sort((a, b) => {
      const rankA = a.percent < 0 ? 101 : a.percent;
      const rankB = b.percent < 0 ? 101 : b.percent;
      return rankA - rankB || a.name.localeCompare(b.name);
    });
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function percentOf(score: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round(clampPercent((score / max) * 100));
}
