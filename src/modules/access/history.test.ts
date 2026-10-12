import { describe, expect, it } from "vitest";
import {
  accessHistoryRangeStart,
  accessHistoryWhere,
  parseAccessHistoryFilters,
  tashkentDayStart,
} from "./history";

// Toshkentda bu payt 13-oktabr, 01:30 (UTC+5).
const NOW = new Date("2026-10-12T20:30:00.000Z");

describe("parseAccessHistoryFilters", () => {
  it("bo'sh parametrlarda standart qiymatlarni beradi", () => {
    expect(parseAccessHistoryFilters(new URLSearchParams())).toEqual({
      q: "",
      direction: "",
      allowed: "",
      range: "all",
      page: 1,
    });
  });

  it("to'g'ri parametrlarni o'qiydi", () => {
    const params = new URLSearchParams({
      q: "  Ali  ",
      direction: "in",
      allowed: "denied",
      range: "week",
      page: "3",
    });
    expect(parseAccessHistoryFilters(params)).toEqual({
      q: "Ali",
      direction: "IN",
      allowed: "denied",
      range: "week",
      page: 3,
    });
  });

  it("noto'g'ri qiymatlarni filtrlaydi", () => {
    const params = new URLSearchParams({
      q: "x".repeat(200),
      direction: "sideways",
      allowed: "maybe",
      range: "forever",
      page: "-5",
    });
    const filters = parseAccessHistoryFilters(params);
    expect(filters.q).toHaveLength(80);
    expect(filters.direction).toBe("");
    expect(filters.allowed).toBe("");
    expect(filters.range).toBe("all");
    expect(filters.page).toBe(1);
  });
});

describe("tashkentDayStart", () => {
  it("Toshkent vaqti bo'yicha kun boshlanishini qaytaradi", () => {
    expect(tashkentDayStart(NOW).toISOString()).toBe("2026-10-12T19:00:00.000Z");
  });

  it("kechqurun UTC vaqtida ham to'g'ri kunni tanlaydi", () => {
    const evening = new Date("2026-10-12T10:00:00.000Z"); // Toshkentda 12-oktabr, 15:00
    expect(tashkentDayStart(evening).toISOString()).toBe("2026-10-11T19:00:00.000Z");
  });
});

describe("accessHistoryRangeStart", () => {
  it("today — bugungi kun boshlanishi", () => {
    expect(accessHistoryRangeStart("today", NOW)?.toISOString()).toBe(
      "2026-10-12T19:00:00.000Z",
    );
  });

  it("week — oxirgi 7 kun", () => {
    expect(accessHistoryRangeStart("week", NOW)?.toISOString()).toBe(
      "2026-10-06T19:00:00.000Z",
    );
  });

  it("month — oxirgi 30 kun", () => {
    expect(accessHistoryRangeStart("month", NOW)?.toISOString()).toBe(
      "2026-09-13T19:00:00.000Z",
    );
  });

  it("all — cheklovsiz", () => {
    expect(accessHistoryRangeStart("all", NOW)).toBeNull();
  });
});

describe("accessHistoryWhere", () => {
  it("bo'sh filtrda shart qo'shmaydi", () => {
    expect(accessHistoryWhere(parseAccessHistoryFilters(new URLSearchParams()), NOW)).toEqual({});
  });

  it("barcha filtrlarni Prisma shartiga aylantiradi", () => {
    const filters = parseAccessHistoryFilters(
      new URLSearchParams({ q: "Ali", direction: "OUT", allowed: "denied", range: "today" }),
    );
    expect(accessHistoryWhere(filters, NOW)).toEqual({
      at: { gte: new Date("2026-10-12T19:00:00.000Z") },
      direction: "OUT",
      allowed: false,
      user: { name: { contains: "Ali", mode: "insensitive" } },
    });
  });

  it("allowed=allowed faqat ruxsat berilganlarni oladi", () => {
    const filters = parseAccessHistoryFilters(new URLSearchParams({ allowed: "allowed" }));
    expect(accessHistoryWhere(filters, NOW)).toEqual({ allowed: true });
  });
});
