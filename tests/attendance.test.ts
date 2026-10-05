import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "@prisma/client";
import { attendanceCounts, EXAM_MIN_PERCENT } from "@/app/api/attendance/summary/data";

function repeat(status: AttendanceStatus, count: number): AttendanceStatus[] {
  return Array.from({ length: count }, () => status);
}

describe("attendanceCounts", () => {
  it("bo'sh ro'yxatda barcha ko'rsatkichlar nolga teng", () => {
    const counts = attendanceCounts([]);
    expect(counts).toEqual({
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      suspicious: 0,
      total: 0,
      percent: 0,
      eligible: false,
    });
  });

  it("PRESENT va LATE qatnashgan hisoblanadi, EXCUSED esa yo'q", () => {
    const counts = attendanceCounts(["PRESENT", "PRESENT", "LATE", "EXCUSED", "ABSENT"]);
    expect(counts.present).toBe(2);
    expect(counts.late).toBe(1);
    expect(counts.excused).toBe(1);
    expect(counts.absent).toBe(1);
    expect(counts.total).toBe(5);
    // EXCUSED is intentionally excluded: 3/5 = 60%, below the 80% gate.
    expect(counts.percent).toBe(60);
    expect(counts.eligible).toBe(false);
  });

  it("foiz formulasi (faqat PRESENT + LATE) / total", () => {
    const counts = attendanceCounts(["PRESENT", "LATE", "EXCUSED", "ABSENT"]);
    expect(counts.percent).toBe(50);
    expect(counts.eligible).toBe(false);
  });

  it("SUSPICIOUS qatnashgan hisoblanMAYdi (anti-fraud signal)", () => {
    const counts = attendanceCounts(["PRESENT", "SUSPICIOUS", "ABSENT"]);
    expect(counts.suspicious).toBe(1);
    expect(counts.percent).toBe(33);
    expect(counts.eligible).toBe(false);
  });

  it("aynan 80% eligible, 79% esa eligible emas", () => {
    const onBoundary = attendanceCounts([...repeat("PRESENT", 4), "ABSENT"]);
    expect(onBoundary.percent).toBe(80);
    expect(onBoundary.eligible).toBe(true);

    const below = attendanceCounts([...repeat("PRESENT", 11), ...repeat("ABSENT", 3)]);
    expect(below.percent).toBe(79);
    expect(below.eligible).toBe(false);
  });

  it("faqat ABSENT bo'lsa foiz 0 va eligible false", () => {
    const counts = attendanceCounts(repeat("ABSENT", 3));
    expect(counts.absent).toBe(3);
    expect(counts.total).toBe(3);
    expect(counts.percent).toBe(0);
    expect(counts.eligible).toBe(false);
  });

  it("barcha darslarda qatnashilsa 100% va eligible true", () => {
    const counts = attendanceCounts([...repeat("PRESENT", 2), ...repeat("LATE", 1)]);
    expect(counts.percent).toBe(100);
    expect(counts.eligible).toBe(true);
  });

  it("EXAM_MIN_PERCENT chegarasi 80", () => {
    expect(EXAM_MIN_PERCENT).toBe(80);
  });
});
