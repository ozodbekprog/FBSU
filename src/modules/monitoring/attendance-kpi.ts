export type AttendanceRow = { studentId: string; status: string };

export type StudentAttendance = {
  studentId: string;
  total: number;
  attended: number;
  percent: number;
};

const ATTENDED_STATUSES = new Set(["PRESENT", "LATE"]);

/** Davomat foizi: faqat PRESENT va LATE qatnashgan hisoblanadi (anti-fraud qoidasi). */
export function attendancePercent(statuses: string[]): number {
  if (statuses.length === 0) return 0;
  const attended = statuses.filter((status) => ATTENDED_STATUSES.has(status)).length;
  return Math.round((attended / statuses.length) * 100);
}

/** Talabalar kesimida davomat statistikasi. */
export function studentAttendance(rows: AttendanceRow[]): StudentAttendance[] {
  const byStudent = new Map<string, string[]>();
  for (const row of rows) {
    const list = byStudent.get(row.studentId) ?? [];
    list.push(row.status);
    byStudent.set(row.studentId, list);
  }
  return Array.from(byStudent.entries()).map(([studentId, statuses]) => ({
    studentId,
    total: statuses.length,
    attended: statuses.filter((status) => ATTENDED_STATUSES.has(status)).length,
    percent: attendancePercent(statuses),
  }));
}

/** 80% dan past davomatli talabalar (kamida 3 yozuv bo'lsa) — o'sish tartibida. */
export function atRiskStudents(rows: AttendanceRow[], threshold = 80): StudentAttendance[] {
  return studentAttendance(rows)
    .filter((row) => row.total >= 3 && row.percent < threshold)
    .sort((a, b) => a.percent - b.percent);
}
