import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { canonicalJson, computeAuditHash, nextChainFields, type AuditHashInput } from "@/server/audit-chain";

const base: AuditHashInput = {
  id: "clx0000000000000000000001",
  actorId: "user-1",
  action: "LOGIN_SUCCESS",
  entity: "Session",
  entityId: "session-1",
  meta: { ip: "127.0.0.1", userAgent: "vitest" },
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
};

describe("canonicalJson", () => {
  it("obyekt kalitlarini rekursiv saralaydi", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("kalit tartibi har xil bo'lsa ham natija bir xil", () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it("massiv tartibini saqlaydi", () => {
    expect(canonicalJson({ list: [2, 1] })).not.toBe(canonicalJson({ list: [1, 2] }));
  });

  it("null va undefined qiymatlarni barqaror kodlaydi", () => {
    expect(canonicalJson({ a: null, b: undefined })).toBe('{"a":null}');
    expect(canonicalJson(undefined)).toBe("null");
  });
});

describe("computeAuditHash", () => {
  it("deterministik: bir xil kirish bir xil hash beradi", () => {
    const first = computeAuditHash({ ...base, prevHash: null });
    const second = computeAuditHash({ ...base, prevHash: null });
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("prevHash natijaga ta'sir qiladi", () => {
    const withoutPrev = computeAuditHash({ ...base, prevHash: null });
    const withPrev = computeAuditHash({ ...base, prevHash: "abc" });
    const otherPrev = computeAuditHash({ ...base, prevHash: "def" });
    expect(withPrev).not.toBe(withoutPrev);
    expect(withPrev).not.toBe(otherPrev);
  });

  it("meta o'zgarsa hash o'zgaradi", () => {
    const first = computeAuditHash({ ...base, prevHash: null });
    const second = computeAuditHash({ ...base, prevHash: null, meta: { ip: "10.0.0.1" } });
    expect(first).not.toBe(second);
  });

  it("action, actorId, createdAt o'zgarishi hashni o'zgartiradi", () => {
    const original = computeAuditHash({ ...base, prevHash: null });
    expect(computeAuditHash({ ...base, prevHash: null, action: "LOGOUT" })).not.toBe(original);
    expect(computeAuditHash({ ...base, prevHash: null, actorId: null })).not.toBe(original);
    expect(
      computeAuditHash({ ...base, prevHash: null, createdAt: new Date("2026-01-01T10:00:01.000Z") }),
    ).not.toBe(original);
  });

  it("meta kalit tartibi hashga ta'sir qilmaydi", () => {
    const first = computeAuditHash({ ...base, prevHash: null, meta: { ip: "1", userAgent: "u" } });
    const second = computeAuditHash({ ...base, prevHash: null, meta: { userAgent: "u", ip: "1" } });
    expect(first).toBe(second);
  });
});

describe("nextChainFields", () => {
  it("oldingi yozuv hashini prevHash sifatida oladi", async () => {
    const findFirst = vi.fn().mockResolvedValue({ hash: "prev-hash" });
    const prisma = { auditLog: { findFirst } } as unknown as PrismaClient;
    const result = await nextChainFields(prisma, base);
    expect(result.prevHash).toBe("prev-hash");
    expect(result.hash).toBe(computeAuditHash({ ...base, prevHash: "prev-hash" }));
    expect(findFirst).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { hash: true },
    });
  });

  it("birinchi yozuvda prevHash null bo'ladi", async () => {
    const prisma = {
      auditLog: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    const result = await nextChainFields(prisma, base);
    expect(result.prevHash).toBeNull();
    expect(result.hash).toBe(computeAuditHash({ ...base, prevHash: null }));
  });
});
