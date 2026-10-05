import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { proxy } from "@/proxy";

const VALID_SESSION = "header.payload.signature";

function makeRequest(
  path: string,
  session?: string,
  init?: { method?: string; csrf?: string },
) {
  const headers = new Headers();
  if (session) headers.set("cookie", `ttpu_session=${session}`);
  if (init?.csrf) headers.set("x-csrf-token", init.csrf);
  return new NextRequest(new URL(path, "http://localhost"), {
    method: init?.method ?? "GET",
    headers,
  });
}

function isPassthrough(res: Response) {
  return res.headers.get("x-middleware-next") === "1";
}

describe("proxy (auth pre-check)", () => {
  it("cookie yo'q: /dashboard → 307 /login?next=...", async () => {
    const res = await proxy(makeRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fdashboard",
    );
  });

  it("query string `next` ichida saqlanadi", async () => {
    const res = await proxy(makeRequest("/schedule?week=3"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fschedule%3Fweek%3D3",
    );
  });

  it("sessiya cookie mavjud bo'lsa o'tkazib yuboriladi", async () => {
    const res = await proxy(makeRequest("/dashboard", VALID_SESSION));
    expect(res.status).toBe(200);
    expect(isPassthrough(res)).toBe(true);
  });

  it("buzilgan cookie shakli himoyalangan sahifaga o'tkazmaydi", async () => {
    const res = await proxy(makeRequest("/admin", "not-a-jwt"));
    expect(res.status).toBe(307);
  });

  it("public sahifa/assetlar cookie'siz ham o'tadi", async () => {
    for (const path of [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/api/csrf",
      "/api/auth/login",
      "/sw.js",
      "/manifest.webmanifest",
      "/robots.txt",
      "/favicon.ico",
      "/logo.svg",
      "/uploads/submissions/file.pdf",
    ]) {
      const res = await proxy(makeRequest(path));
      expect(isPassthrough(res), `${path} o'tishi kerak`).toBe(true);
    }
  });

  it("himoyalangan sahifalar cookie'siz redirect qilinadi", async () => {
    for (const path of ["/dashboard", "/admin", "/profile", "/settings", "/help"]) {
      const res = await proxy(makeRequest(path));
      expect(res.status, path).toBe(307);
    }
  });

  it("`next` har doim lokal path (tashqi origin emas)", async () => {
    const res = await proxy(makeRequest("/dashboard"));
    const location = res.headers.get("location") ?? "";
    expect(location.startsWith("http://localhost/login?next=%2F")).toBe(true);
    expect(location).not.toContain("example.com");
    expect(location).not.toContain("//example");
  });
});

describe("proxy (CSRF gate)", () => {
  it("GET so'rovlari token'siz o'tadi", async () => {
    const res = await proxy(makeRequest("/api/me"));
    expect(isPassthrough(res)).toBe(true);
  });

  it("POST /api/* token'siz → 403", async () => {
    const res = await proxy(
      makeRequest("/api/schedule", VALID_SESSION, { method: "POST" }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("PATCH va DELETE ham himoyalangan", async () => {
    for (const method of ["PATCH", "PUT", "DELETE"]) {
      const res = await proxy(
        makeRequest("/api/schedule/abc", VALID_SESSION, { method }),
      );
      expect(res.status, method).toBe(403);
    }
  });

  it("header cookie bilan mos kelmasa → 403", async () => {
    const res = await proxy(
      makeRequest("/api/schedule", VALID_SESSION, {
        method: "POST",
        csrf: "not-the-cookie-value",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("boshqa sahifalardagi POST'lar proxy tomonidan bloklanmaydi", async () => {
    const res = await proxy(
      makeRequest("/dashboard", VALID_SESSION, { method: "POST" }),
    );
    expect(isPassthrough(res)).toBe(true);
  });
});

async function signedSession(role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode("test-secret"));
}

describe("proxy (rol darvozasi: /approvals)", () => {
  it("registrator tokeni bilan o'tadi", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const token = await signedSession("REGISTRAR");
    const res = await proxy(makeRequest("/approvals", token));
    expect(isPassthrough(res)).toBe(true);
  });

  it("admin tokeni bilan o'tadi", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const token = await signedSession("ADMIN");
    const res = await proxy(makeRequest("/approvals", token));
    expect(isPassthrough(res)).toBe(true);
  });

  it("talaba tokeni /dashboardga 307 yo'naltiriladi", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const token = await signedSession("STUDENT");
    const res = await proxy(makeRequest("/approvals", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("soxta token /dashboardga 307 yo'naltiriladi", async () => {
    process.env.AUTH_SECRET = "test-secret";
    const res = await proxy(makeRequest("/approvals", VALID_SESSION));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/dashboard");
  });
});
