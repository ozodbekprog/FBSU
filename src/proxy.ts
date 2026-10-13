import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Fast auth pre-check for protected app routes.
 *
 * This is ONLY a cheap "is there a session cookie?" gate that runs before the
 * page is rendered. It does NOT verify the JWT signature, expiration, user
 * status, session epoch or role — real authorization stays in the server-side
 * `requireUser()` / `requireRole()` (src/lib/auth.ts). The goal here is to
 * answer protected requests with a real HTTP 307 instead of a streamed 200
 * that only redirects via a meta-refresh/JS after `requireUser()` runs.
 *
 * Next.js 16 uses the `proxy.ts` file convention (formerly `middleware.ts`).
 * This is the enhanced version of the repo's original `src/proxy.ts`: a
 * stricter cookie-shape check, an encoded `next` parameter and a public
 * allowlist instead of a hardcoded protected-prefix list.
 */

const SESSION_COOKIE = "ttpu_session";

/** Pages that must stay reachable without a session (auth flow, landing). */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/apply",
]);

/** Public prefixes: framework internals, API routes, uploaded files. */
const PUBLIC_PREFIXES = ["/_next/", "/api/", "/uploads/"];

/** Individual public files served from /public. */
const PUBLIC_FILES = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
  "/favicon.ico",
  "/icon.svg",
  "/logo.svg",
]);

/** Any path whose last segment looks like a static file (photo.png, app.webmanifest, ...). */
const FILE_EXTENSION = /\.[a-z0-9]+$/i;

/**
 * Methods that never change state and therefore never need a CSRF token.
 */
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * API endpoints that are reachable without a CSRF token.
 *
 * - `/api/csrf` only *mints* the token (GET).
 * - `/api/health` is a stateless liveness probe.
 * Everything else under `/api/` must present a valid double-submit token:
 * the auth endpoints (login, register, forgot, reset) included — the
 * login/register forms fetch `/api/csrf` first and apiFetch
 * (src/lib/api.ts, src/lib/csrf-client.ts) auto-injects the header.
 */
const CSRF_EXEMPT_API = ["/api/csrf", "/api/health"];

function csrfSecret(): Uint8Array {
  const secret = process.env.CSRF_SECRET || process.env.AUTH_SECRET;
  if (!secret) return new TextEncoder().encode("");
  return new TextEncoder().encode(secret);
}

async function isValidCsrf(token: string | undefined, cookie: string | undefined): Promise<boolean> {
  if (!token || !cookie || token !== cookie) return false;
  try {
    await jwtVerify(token, csrfSecret());
    return true;
  } catch {
    return false;
  }
}

/**
 * Central CSRF gate for every state-changing API request.
 *
 * Individual route handlers may still call `verifyCsrfFromRequest()` (that is
 * fine and keeps them safe if they are ever mounted outside the proxy), but
 * this gate guarantees that a newly added route is protected by default
 * instead of by memory.
 */
async function enforceCsrf(request: NextRequest): Promise<NextResponse | null> {
  if (CSRF_SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  if (CSRF_EXEMPT_API.some((prefix) => pathname.startsWith(prefix))) return null;

  const ok = await isValidCsrf(
    request.headers.get("x-csrf-token") ?? undefined,
    request.cookies.get("csrf_token")?.value,
  );
  if (ok) return null;

  return NextResponse.json(
    { ok: false, error: "CSRF token yaroqsiz" },
    { status: 403 },
  );
}

function isPublicPath(pathname: string): boolean {
  // Treat "/login/" the same as "/login" (Next normalizes the trailing slash
  // only after middleware has already run).
  const path =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (PUBLIC_PATHS.has(path)) return true;
  if (path.startsWith("/verify/")) return true;
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  if (PUBLIC_FILES.has(path)) return true;
  return FILE_EXTENSION.test(path);
}

/**
 * Cheap shape check for the httpOnly session JWT (`header.payload.signature`).
 * A malformed cookie is treated as "no session"; a well-formed but forged or
 * expired token still passes this gate and is rejected by `requireUser()`.
 */
function looksLikeSessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

/**
 * Exam-only rejim: `fbsu-exam.vercel.app` (va EXAM_HOSTS ro'yxatidagi
 * domenlar) faqat imtihonga oid sahifalarni ko'rsatadi. Boshqa har qanday
 * LMS yo'li "/" ga qaytariladi, "/" esa imtihon bosh sahifasiga (rewrite
 * /e) ochiladi. Shu tarzda exam domenida LMS menyusi ko'rinmaydi.
 */
const EXAM_HOSTS = (process.env.EXAM_HOSTS ?? "fbsu-exam.vercel.app")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const EXAM_ALLOWED_EXACT = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);
const EXAM_ALLOWED_SECTIONS = ["/e", "/exam", "/secure-exams", "/quizzes"];
const EXAM_ALLOWED_PREFIXES = ["/api/", "/_next/", "/uploads/", "/verify/"];

function isExamHost(host: string | null): boolean {
  if (!host) return false;
  return EXAM_HOSTS.includes(host.toLowerCase());
}

function examRequestHost(request: NextRequest): string | null {
  const raw = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first || null;
}

function isExamHostPath(pathname: string): boolean {
  if (EXAM_ALLOWED_EXACT.has(pathname)) return true;
  if (
    EXAM_ALLOWED_SECTIONS.some(
      (section) => pathname === section || pathname.startsWith(`${section}/`),
    )
  ) {
    return true;
  }
  return EXAM_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Role-gated pages: the proxy verifies the session JWT and answers with a real
 * 307 instead of a streamed page redirect. Real authorization still lives in
 * the page (`requireUser`), this only makes the gate server-side.
 */
const ROLE_GATED: Record<string, string[]> = {
  "/approvals": ["ADMIN", "REGISTRAR", "REKTOR"],
  "/monitoring": ["ADMIN", "REKTOR", "PRO_RECTOR", "DEKAN", "KAFEDRA_MUDIRI", "REGISTRAR"],
};

function sessionSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return new TextEncoder().encode("");
  return new TextEncoder().encode(secret);
}

async function sessionRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // State-changing API calls are CSRF-checked here before anything else runs.
  const csrfError = await enforceCsrf(request);
  if (csrfError) return csrfError;

  // Exam domeni: faqat imtihonga oid yo'llar; qolgani "/" ga qaytadi.
  if (isExamHost(examRequestHost(request))) {
    if (pathname === "/") {
      const session = request.cookies.get(SESSION_COOKIE)?.value;
      if (!looksLikeSessionCookie(session)) {
        return NextResponse.redirect(new URL("/login?next=%2Fe", request.url), 307);
      }
      return NextResponse.rewrite(new URL("/e", request.url));
    }
    if (!isExamHostPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url), 307);
    }
    if (pathname === "/secure-exams" || pathname.startsWith("/secure-exams/")) {
      const role = await sessionRole(request.cookies.get(SESSION_COOKIE)?.value ?? "");
      if (role !== "TEACHER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", request.url), 307);
      }
    }
  }

  // Public pages and static/API assets never need the cookie gate.
  if (isPublicPath(pathname)) return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!looksLikeSessionCookie(sessionCookie)) {
    // `next` is built from the request's own pathname+search, so it can never
    // point at another origin (no open redirect); it is also URL-encoded.
    return NextResponse.redirect(
      new URL("/login?next=" + encodeURIComponent(pathname + search), request.url),
      307,
    );
  }

  const gated = Object.entries(ROLE_GATED).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (gated) {
    const role = await sessionRole(sessionCookie ?? "");
    if (!role || !gated[1].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url), 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  /**
   * `/api/**` is now matched too: the proxy enforces CSRF on state-changing API
   * calls before any handler runs, and returns `NextResponse.next()` for public
   * API paths so it never interferes with routing. `.*\..*` still excludes
   * static files, which need no gate.
   */
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
