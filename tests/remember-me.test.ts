import { describe, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";

const { setCookie, userFindUnique } = vi.hoisted(() => ({
  setCookie: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: setCookie,
    delete: vi.fn(),
    get: vi.fn(),
  }),
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    trustedDevice: {
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({
        id: "dev-1",
        name: "Vitest",
        platform: null,
        browser: null,
      })),
      update: vi.fn(async () => ({ id: "dev-1" })),
    },
    loginRecord: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetAt: 0 })),
  clearRateLimit: vi.fn(async () => {}),
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn(async () => {}),
  getClientInfo: vi.fn(() => ({ ip: "local", userAgent: "test" })),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(() => "local"),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(async () => true) },
}));

const { createSession } = await import("@/lib/auth");
const { POST } = await import("@/app/api/auth/login/route");

process.env.AUTH_SECRET = "ttpu-test-secret";

const SECOND_PER_DAY = 60 * 60 * 24;
const USER = {
  id: "u1",
  role: "STUDENT" as const,
  name: "Test",
  email: "test@ttpu.uz",
  sessionEpoch: 0,
};

async function lastToken() {
  const call = setCookie.mock.calls.at(-1);
  return call?.[1] as string;
}

async function tokenLifetime(token: string) {
  const key = new TextEncoder().encode(process.env.AUTH_SECRET);
  const { payload } = await jwtVerify(token, key);
  return (payload.exp ?? 0) - (payload.iat ?? 0);
}

function lastCookieMaxAge() {
  const call = setCookie.mock.calls.at(-1);
  return call?.[2]?.maxAge;
}

describe("remember me — createSession muddati", () => {
  it("remember ko'rsatilmaganida sessiya 7 kun (604800 soniya)", async () => {
    setCookie.mockClear();
    await createSession(USER);
    expect(await tokenLifetime(await lastToken())).toBe(7 * SECOND_PER_DAY);
    expect(lastCookieMaxAge()).toBe(7 * SECOND_PER_DAY);
  });

  it("remember=false — 7 kun (default xulq o'zgarmaydi)", async () => {
    setCookie.mockClear();
    await createSession(USER, { remember: false });
    expect(await tokenLifetime(await lastToken())).toBe(7 * SECOND_PER_DAY);
    expect(lastCookieMaxAge()).toBe(7 * SECOND_PER_DAY);
  });

  it("remember=true — sessiya 30 kun (2592000 soniya)", async () => {
    setCookie.mockClear();
    await createSession(USER, { remember: true });
    expect(await tokenLifetime(await lastToken())).toBe(30 * SECOND_PER_DAY);
    expect(lastCookieMaxAge()).toBe(30 * SECOND_PER_DAY);
  });
});

describe("remember me — login route payload", () => {
  function loginRequest(remember?: boolean) {
    const body = { email: USER.email, password: "ttpu1234" };
    return new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        remember === undefined ? body : { ...body, remember },
      ),
    });
  }

  it("remember=true payload'ida cookie maxAge 30 kun", async () => {
    userFindUnique.mockResolvedValue({
      id: USER.id,
      email: USER.email,
      name: USER.name,
      role: USER.role,
      passwordHash: "hash",
      isActive: true,
      sessionEpoch: USER.sessionEpoch,
    });
    setCookie.mockClear();
    const res = await POST(loginRequest(true));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(lastCookieMaxAge()).toBe(30 * SECOND_PER_DAY);
  });

  it("remember yo'q payload'ida cookie maxAge 7 kun", async () => {
    setCookie.mockClear();
    const res = await POST(loginRequest());
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(lastCookieMaxAge()).toBe(7 * SECOND_PER_DAY);
  });
});
