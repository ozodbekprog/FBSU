import { describe, expect, it } from "vitest";
import { isIpInSubnet, normalizeSubnet } from "./access-rules";

describe("isIpInSubnet", () => {
  it("aniq IP mos kelsa true qaytaradi", () => {
    expect(isIpInSubnet("10.0.0.1", "10.0.0.1")).toBe(true);
  });

  it("aniq IP boshqa bo'lsa false qaytaradi", () => {
    expect(isIpInSubnet("10.0.0.2", "10.0.0.1")).toBe(false);
  });

  it("CIDR ichidagi IP uchun true qaytaradi", () => {
    expect(isIpInSubnet("192.168.0.42", "192.168.0.0/24")).toBe(true);
    expect(isIpInSubnet("192.168.1.1", "192.168.0.0/16")).toBe(true);
    expect(isIpInSubnet("10.10.10.10", "10.0.0.0/8")).toBe(true);
  });

  it("CIDR tashqarisidagi IP uchun false qaytaradi", () => {
    expect(isIpInSubnet("192.168.1.42", "192.168.0.0/24")).toBe(false);
    expect(isIpInSubnet("11.10.10.10", "10.0.0.0/8")).toBe(false);
  });

  it("/32 prefiks faqat bitta IP ni qabul qiladi", () => {
    expect(isIpInSubnet("172.16.5.4", "172.16.5.4/32")).toBe(true);
    expect(isIpInSubnet("172.16.5.5", "172.16.5.4/32")).toBe(false);
  });

  it("/0 prefiks barcha IPv4 manzillarni qabul qiladi", () => {
    expect(isIpInSubnet("1.2.3.4", "0.0.0.0/0")).toBe(true);
    expect(isIpInSubnet("255.255.255.255", "0.0.0.0/0")).toBe(true);
  });

  it("prefiks chegarasini to'g'ri hisoblaydi", () => {
    expect(isIpInSubnet("192.168.0.255", "192.168.0.0/24")).toBe(true);
    expect(isIpInSubnet("192.168.1.0", "192.168.0.0/24")).toBe(false);
  });

  it("noto'g'ri IP yoki subnet uchun false qaytaradi", () => {
    expect(isIpInSubnet("999.1.1.1", "192.168.0.0/24")).toBe(false);
    expect(isIpInSubnet("192.168.0.1", "192.168.0.0/33")).toBe(false);
    expect(isIpInSubnet("192.168.0.1", "192.168.0")).toBe(false);
    expect(isIpInSubnet("", "10.0.0.0/8")).toBe(false);
    expect(isIpInSubnet("10.0.0.1", "")).toBe(false);
  });
});

describe("normalizeSubnet", () => {
  it("aniq IP ni qaytaradi", () => {
    expect(normalizeSubnet("  10.0.0.1 ")).toBe("10.0.0.1");
  });

  it("CIDR ni normallashtiradi", () => {
    expect(normalizeSubnet(" 192.168.0.0/24 ")).toBe("192.168.0.0/24");
    expect(normalizeSubnet("192.168.000.010/24")).toBe("192.168.0.10/24");
    expect(normalizeSubnet("0.0.0.0/0")).toBe("0.0.0.0/0");
    expect(normalizeSubnet("10.0.0.1/32")).toBe("10.0.0.1/32");
  });

  it("prefiks uzunligi noto'g'ri bo'lsa null qaytaradi", () => {
    expect(normalizeSubnet("10.0.0.1/032")).toBeNull();
    expect(normalizeSubnet("10.0.0.1/")).toBeNull();
  });

  it("bo'sh qiymat uchun null qaytaradi", () => {
    expect(normalizeSubnet("")).toBeNull();
    expect(normalizeSubnet("   ")).toBeNull();
  });

  it("noto'g'ri format uchun null qaytaradi", () => {
    expect(normalizeSubnet("192.168.0.0/33")).toBeNull();
    expect(normalizeSubnet("192.168.0.256")).toBeNull();
    expect(normalizeSubnet("192.168.0.0/24/8")).toBeNull();
    expect(normalizeSubnet("192.168.0.0/abc")).toBeNull();
    expect(normalizeSubnet("subnet")).toBeNull();
  });
});
