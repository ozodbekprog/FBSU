import { describe, expect, it } from "vitest";
import {
  FACE_MATCH_THRESHOLD,
  checkFace,
  faceDistance,
  faceMatches,
  isValidFaceDescriptor,
} from "./face";

const base = Array.from({ length: 128 }, (_, index) => (index % 7) / 10);
const near = base.map((value, index) => (index === 0 ? value + 0.4 : value));
const far = base.map((value, index) => value + 1.5);

describe("isValidFaceDescriptor", () => {
  it("128 o'lchamli chekli sonlar massivini qabul qiladi", () => {
    expect(isValidFaceDescriptor(base)).toBe(true);
  });

  it("noto'g'ri o'lcham yoki qiymatlarni rad etadi", () => {
    expect(isValidFaceDescriptor([1, 2, 3])).toBe(false);
    expect(isValidFaceDescriptor(null)).toBe(false);
    expect(isValidFaceDescriptor(Array.from({ length: 128 }, () => Number.NaN))).toBe(false);
  });
});

describe("faceDistance", () => {
  it("bir xil vektorlar orasidagi masofa 0", () => {
    expect(faceDistance(base, base)).toBe(0);
  });

  it("vektorlar farqiga mos masofa qaytaradi", () => {
    expect(faceDistance(base, near)).toBeCloseTo(0.4, 5);
  });
});

describe("faceMatches / checkFace", () => {
  it("yaqin deskriptor mos keladi", () => {
    expect(faceMatches(base, near)).toBe(true);
    expect(checkFace(base, near)).toBe("ok");
  });

  it("uzoq deskriptor mos kelmaydi", () => {
    expect(faceMatches(base, far)).toBe(false);
    expect(checkFace(base, far)).toBe("mismatch");
    expect(faceDistance(base, far)).toBeGreaterThan(FACE_MATCH_THRESHOLD);
  });

  it("yuz yoqilmagan yoki yuborilmagan holatlarni ajratadi", () => {
    expect(checkFace(null, base)).toBe("not_enrolled");
    expect(checkFace(base, null)).toBe("missing");
  });
});
