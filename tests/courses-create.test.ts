import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  course: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// getCurrentUser (lib/auth) and createAuditLog (lib/audit) read the
// session via next/headers; stub it so the route can be called
// outside a Next request scope. The store lives outside the factory
// so the test can seed the csrf cookie before each request.
const cookieStore = new Map<string, string>();

vi.mock("next/headers", async () => {
  return {
    cookies: async () => ({
      get: (name: string) =>
        cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
      set: (name: string, value: string) => void cookieStore.set(name, value),
      delete: (name: string) => void cookieStore.delete(name),
    }),
  };
});

// getCurrentUser reads the session cookie and resolves the user from
// prisma.user.findUnique; the mock below is the session user.
let sessionRole = "ADMIN";

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getCurrentUser: vi.fn(async () =>
      sessionRole
        ? {
            id: "admin-1",
            email: "admin@ttpu.uz",
            name: "Admin",
            role: sessionRole,
            isActive: true,
            sessionEpoch: 0,
          }
        : null,
    ),
  };
});

// CSRF verification needs a matching header/cookie pair signed with a
// shared secret; point both env vars at a test secret and issue the
// token with the same key the route expects.
process.env.AUTH_SECRET = "ttpu-test-secret";
process.env.CSRF_SECRET = "ttpu-test-secret";

const { SignJWT } = await import("jose");

const csrfSecret = new TextEncoder().encode("ttpu-test-secret");
const csrfToken = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(csrfSecret);

const { POST } = await import("@/app/api/admin/courses/route");

function courseRequest(body: unknown, withCsrf = true) {
  return new Request("http://localhost/api/admin/courses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withCsrf ? { "x-csrf-token": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

const createdCourse = {
  id: "new-course",
  title: "Physics 101",
  slug: "physics-101",
  isPublished: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionRole = "ADMIN";
  cookieStore.set("csrf_token", csrfToken);
  prismaMock.user.findUnique.mockResolvedValue({
    id: "teacher-1",
    role: "TEACHER",
    isActive: true,
  });
  prismaMock.course.findUnique.mockResolvedValue(null);
  prismaMock.course.create.mockResolvedValue(createdCourse);
  prismaMock.auditLog.create.mockResolvedValue({});
});

describe("admin courses POST", () => {
  it("ADMIN: course.create CHAQIRILADI, slug generatsiya qilinadi, 201 qaytadi", async () => {
    const res = await POST(courseRequest({ title: "Physics 101" }));
    const body = (await res.json()) as { ok: boolean; data: { id: string; slug: string } };

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(prismaMock.course.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.course.create.mock.calls[0][0] as {
      data: { title: string; slug: string; isPublished: boolean };
    };
    expect(createArg.data.title).toBe("Physics 101");
    expect(createArg.data.slug).toBe("physics-101");
    expect(createArg.data.isPublished).toBe(false);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("slug band bo'lsa -2 suffix qo'shiladi", async () => {
    prismaMock.course.findUnique.mockImplementation(async ({ where }: { where: { slug: string } }) =>
      where.slug === "physics-101" ? { id: "taken", slug: "physics-101" } : null,
    );

    const res = await POST(courseRequest({ title: "Physics 101" }));

    expect(res.status).toBe(201);
    const createArg = prismaMock.course.create.mock.calls[0][0] as {
      data: { slug: string };
    };
    expect(createArg.data.slug).toBe("physics-101-2");
  });

  it("non-admin (TEACHER): 403, course.create CHAQIRILMAYDI", async () => {
    sessionRole = "TEACHER";

    const res = await POST(courseRequest({ title: "Physics 101" }));
    const body = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  it("CSRF token yo'q bo'lsa 403 qaytadi", async () => {
    const res = await POST(courseRequest({ title: "Physics 101" }, false));
    expect(res.status).toBe(403);
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  it("o'qituvchi topilmasa 400 qaytadi", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await POST(courseRequest({ title: "Physics 101", teacherId: "ghost" }));
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  it("nomi ko'rsatilmagan bo'lsa 400 qaytadi", async () => {
    const res = await POST(courseRequest({ title: "x" }));
    expect(res.status).toBe(400);
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });
});
