import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  decryptDeep,
  decryptJson,
  decryptString,
  encryptBytes,
  encryptJson,
  encryptString,
  isEncrypted,
} from "@/lib/crypto";

process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.DATA_ENCRYPTION_KEY_ID = "test";

describe("matn shifrlash", () => {
  it("randomized round-trip", () => {
    const secret = "Falonchi Falonchiyev";
    const cipher = encryptString(secret);
    expect(cipher).not.toBe(secret);
    expect(isEncrypted(cipher)).toBe(true);
    expect(decryptString(cipher)).toBe(secret);
  });

  it("har safar boshqa shifr beradi", () => {
    expect(encryptString("bir xil")).not.toBe(encryptString("bir xil"));
  });

  it("deterministic bir xil qiymatga bir xil shifr beradi", () => {
    const a = encryptString("user@ttpu.uz", "deterministic");
    const b = encryptString("user@ttpu.uz", "deterministic");
    const c = encryptString("boshqa@ttpu.uz", "deterministic");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(decryptString(a)).toBe("user@ttpu.uz");
  });

  it("idempotent: allaqachon shifrlangan qiymat qayta shifrlanmaydi", () => {
    const cipher = encryptString("takrorlama");
    expect(encryptString(cipher)).toBe(cipher);
  });

  it("soxta shifrni deshifrlay olmaydi, asl qiymatni qaytaradi", () => {
    const tampered = `${encryptString("maxfiy").slice(0, -4)}AAAA`;
    expect(decryptString(tampered)).toBe(tampered);
  });

  it("shifrlanmagan matnni tegmasdan qaytaradi", () => {
    expect(decryptString("oddiy matn")).toBe("oddiy matn");
  });
});

describe("JSON shifrlash", () => {
  it("round-trip", () => {
    const value = { descriptor: [0.1, 0.2, 0.3], label: "yuz" };
    const cipher = encryptJson(value);
    expect(cipher.startsWith("encj.v1.")).toBe(true);
    expect(decryptJson(cipher)).toEqual(value);
  });
});

describe("Bayt shifrlash", () => {
  it("round-trip", () => {
    const data = Buffer.from("ovozli xabar mazmuni", "utf8");
    const cipher = encryptBytes(data);
    expect(isEncrypted(cipher)).toBe(true);
    expect(decryptBytes(cipher).toString("utf8")).toBe("ovozli xabar mazmuni");
  });

  it("shifrlanmagan buferni o'zgartirmaydi", () => {
    const data = Buffer.from("xom", "utf8");
    expect(decryptBytes(data).toString("utf8")).toBe("xom");
  });
});

describe("decryptDeep", () => {
  it("ichma-ich obyekt va massivlarni deshifrlaydi", () => {
    const input = {
      id: "1",
      name: encryptString("Ali Valiyev"),
      meta: { bio: encryptString("bio matni") },
      faces: encryptJson([1, 2, 3]),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      group: { name: "AI2-26" },
    };
    const output = decryptDeep(input);
    expect(output.name).toBe("Ali Valiyev");
    expect(output.meta.bio).toBe("bio matni");
    expect(output.faces).toEqual([1, 2, 3]);
    expect(output.group.name).toBe("AI2-26");
    expect(output.createdAt).toBeInstanceOf(Date);
  });
});
