import { describe, expect, it } from "vitest";
import { evaluateRule } from "./access";

const NOW = new Date("2026-10-17T09:00:00.000Z");
const BEFORE = new Date("2026-10-17T08:00:00.000Z");
const AFTER = new Date("2026-10-17T10:00:00.000Z");

describe("evaluateRule", () => {
  it("qoida yo'q bo'lsa faoliyat ochiq", () => {
    expect(evaluateRule(null, NOW)).toEqual({ open: true, reason: null });
    expect(evaluateRule(undefined, NOW)).toEqual({ open: true, reason: null });
  });

  it("bo'sh oyna ochiq holat beradi", () => {
    expect(evaluateRule({}, NOW)).toEqual({ open: true, reason: null });
    expect(evaluateRule({ availableFrom: null, availableTo: null }, NOW)).toEqual({
      open: true,
      reason: null,
    });
  });

  it("boshlanish vaqti kelmagan bo'lsa before", () => {
    expect(evaluateRule({ availableFrom: AFTER }, NOW)).toEqual({ open: false, reason: "before" });
  });

  it("tugash vaqti o'tgan bo'lsa after", () => {
    expect(evaluateRule({ availableTo: BEFORE }, NOW)).toEqual({ open: false, reason: "after" });
  });

  it("oraliq ichida ochiq", () => {
    expect(evaluateRule({ availableFrom: BEFORE, availableTo: AFTER }, NOW)).toEqual({
      open: true,
      reason: null,
    });
  });

  it("chegaraga teng vaqtda ochiq", () => {
    expect(evaluateRule({ availableFrom: NOW }, NOW).open).toBe(true);
    expect(evaluateRule({ availableTo: NOW }, NOW).open).toBe(true);
    expect(evaluateRule({ availableFrom: NOW, availableTo: NOW }, NOW)).toEqual({
      open: true,
      reason: null,
    });
  });

  it("nuqtali oynada vaqt o'tgach after", () => {
    const next = new Date("2026-10-17T09:00:00.001Z");
    expect(evaluateRule({ availableFrom: NOW, availableTo: NOW }, next).reason).toBe("after");
  });
});
