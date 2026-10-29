import { describe, expect, it } from "vitest";
import { generateApiToken, hashApiToken } from "./token";

describe("generateApiToken", () => {
  it("fbsu_ prefiksi va 64 hex belgidan iborat", () => {
    expect(generateApiToken()).toMatch(/^fbsu_[0-9a-f]{64}$/);
  });

  it("har chaqiriqda yangi token qaytaradi", () => {
    expect(generateApiToken()).not.toBe(generateApiToken());
  });
});

describe("hashApiToken", () => {
  it("bir xil token uchun deterministik natija beradi", () => {
    const token = "fbsu_" + "a".repeat(64);
    expect(hashApiToken(token)).toBe(hashApiToken(token));
  });

  it("64 belgili hex qaytaradi", () => {
    expect(hashApiToken(generateApiToken())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("turli tokenlar uchun turli hash qaytaradi", () => {
    expect(hashApiToken("fbsu_alpha")).not.toBe(hashApiToken("fbsu_beta"));
  });
});
