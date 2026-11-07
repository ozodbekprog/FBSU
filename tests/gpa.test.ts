import { describe, expect, it } from "vitest";
import {
  COURSE_POINTS_PASS,
  coursePoints30,
  gpaPoints,
  letterGrade,
  points30Percent,
} from "@/app/api/gpa/data";
import type { GpaLetter } from "@/app/api/gpa/data";

describe("gpaPoints", () => {
  it.each([
    [100, 4],
    [95, 4],
    [90, 4],
    [89, 3.7],
    [85, 3.7],
    [84, 3.3],
    [80, 3.3],
    [79, 3],
    [75, 3],
    [74, 2.7],
    [70, 2.7],
    [69, 2.3],
    [65, 2.3],
    [64, 2],
    [60, 2],
    [59, 0],
    [30, 0],
    [0, 0],
  ])("foiz %i uchun GPA ball %s", (percent, expected) => {
    expect(gpaPoints(percent)).toBe(expected);
  });
});

describe("letterGrade", () => {
  it.each([
    [100, "A"],
    [90, "A"],
    [89, "B"],
    [80, "B"],
    [79, "C"],
    [70, "C"],
    [69, "D"],
    [60, "D"],
    [59, "F"],
    [0, "F"],
  ])("foiz %i uchun harf baho %s", (percent, expected) => {
    expect(letterGrade(percent)).toBe(expected);
  });

  it("barcha harflar GpaLetter tipiga mos keladi", () => {
    const letters: GpaLetter[] = [100, 85, 75, 65, 10].map((percent) => letterGrade(percent));
    expect(letters).toEqual(["A", "B", "C", "D", "F"]);
  });
});

describe("coursePoints30", () => {
  it("xom ballni 30 ballik shkalaga o'giradi", () => {
    expect(coursePoints30(92, 100, 0)).toBe(27.6);
    expect(coursePoints30(46, 50, 0)).toBe(27.6);
  });

  it("bonus aynan 30 ballik shkalaga qo'shiladi (xom ballga emas)", () => {
    expect(coursePoints30(92, 100, 1)).toBe(28.6);
    expect(points30Percent(coursePoints30(92, 100, 1)!)).toBe(95);
  });

  it("18 ball — o'tish chegarasi (60%)", () => {
    const points30 = coursePoints30(60, 100, 0);
    expect(points30).toBe(COURSE_POINTS_PASS);
    expect(points30Percent(points30!)).toBeGreaterThanOrEqual(60);
  });

  it("ball 0–30 oralig'ida qoladi", () => {
    expect(coursePoints30(100, 100, 4)).toBe(30);
    expect(coursePoints30(0, 100, 0)).toBe(0);
    expect(coursePoints30(0, 100, -5)).toBe(0);
  });

  it("maksimal ball bo'lmasa null qaytaradi", () => {
    expect(coursePoints30(0, 0, 1)).toBeNull();
    expect(coursePoints30(5, -1, 1)).toBeNull();
  });
});
