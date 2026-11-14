import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signTrafficHit, verifyTrafficHit } from "./signature";

describe("traffic hit signature", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("to'g'ri imzoni tasdiqlaydi", () => {
    const ts = String(Date.now());
    const signature = signTrafficHit(ts, "v_abc12345", "/dashboard");
    expect(signature).toBeTruthy();
    expect(verifyTrafficHit(ts, "v_abc12345", "/dashboard", signature ?? "")).toBe(true);
  });

  it("boshqa yo'l bilan imzo mos kelmaydi", () => {
    const ts = String(Date.now());
    const signature = signTrafficHit(ts, "v_abc12345", "/dashboard");
    expect(verifyTrafficHit(ts, "v_abc12345", "/admin", signature ?? "")).toBe(false);
  });

  it("eski imzoni rad etadi", () => {
    const ts = String(Date.now() - 5 * 60_000);
    const signature = signTrafficHit(ts, "v_abc12345", "/dashboard");
    expect(verifyTrafficHit(ts, "v_abc12345", "/dashboard", signature ?? "")).toBe(false);
  });
});
