import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  announcement: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  notification: {
    createMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// getCurrentUser reads the session cookie via next/headers; stub the cookie
// store so the route can be called outside a Next request scope.
vi.mock("next/headers", async () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ttpu_session" || name === "csrf_token"
        ? { name, value: "fake-value" }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("jose", () => ({
  ...vi.importActual<typeof import("jose")>("jose"),
  jwtVerify: vi.fn(),
}));

// CSRF: header va cookie bir xil bo'lgina yetarli — token imzosini tekshirishni stub qilamiz.
const csrfMock = { verifyCsrfFromRequest: vi.fn().mockResolvedValue(true) };
vi.mock("@/lib/csrf", async () => {
  const actual = await vi.importActual<typeof import("@/lib/csrf")>("@/lib/csrf");
  return { ...actual, ...csrfMock };
});

import { jwtVerify } from "jose";

process.env.AUTH_SECRET = "ttpu-test-secret";

const { POST, GET } = await import("@/app/api/admin/announcements/route");

beforeEach(() => {
  vi.clearAllMocks();
  csrfMock.verifyCsrfFromRequest.mockResolvedValue(true);
});

function adminRequest(payload: unknown) {
  return new Request("http://localhost/api/admin/announcements", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": "valid-token",
      cookie: "csrf_token=valid-token; ttpu_session=fake-session-token",
    },
    body: JSON.stringify(payload),
  });
}

function setSession(role: string) {
  vi.mocked(jwtVerify).mockResolvedValue({
    payload: {
      uid: "user-1",
      role,
      name: "User",
      email: "user@ttpu.uz",
      epoch: 1,
    },
    protectedHeader: () => ({ alg: "HS256" }),
  } as never);

  prismaMock.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "user@ttpu.uz",
    name: "User",
    role,
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    preferences: null,
    isActive: true,
    sessionEpoch: 1,
    createdAt: new Date(),
    groupId: null,
    subGroupId: null,
    facultyId: null,
    departmentId: null,
    group: null,
    subGroup: null,
    faculty: null,
    department: null,
  });
}

describe("admin announcements route", () => {
  it("ADMIN global e'lon yaratadi → createMany to'g'ri audience bilan chaqiriladi", async () => {
    setSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([
      { id: "student-1" },
      { id: "student-2" },
      { id: "teacher-1" },
    ]);
    prismaMock.announcement.create.mockResolvedValue({
      id: "ann-1",
      courseId: null,
      authorId: "user-1",
      title: "Imtihon jadvali",
      body: "Ertaga imtihon",
      audience: "ALL",
      createdAt: new Date(),
      author: { id: "user-1", name: "Admin" },
    });
    prismaMock.notification.createMany.mockResolvedValue({ count: 3 });

    const res = await POST(adminRequest({ title: "Imtihon jadvali", body: "Ertaga imtihon" }));
    const body = (await res.json()) as {
      ok: boolean;
      data: { announcement: { id: string }; recipients: number };
    };

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.announcement.id).toBe("ann-1");
    expect(prismaMock.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: null }),
      }),
    );
    expect(prismaMock.notification.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: "student-1",
          title: "Yangi e'lon: Imtihon jadvali",
          link: "/notifications",
        }),
        expect.objectContaining({ userId: "teacher-1" }),
      ]),
    });
  });

  it("rol bo'yicha audience: faqat tanlangan rollar topiladi", async () => {
    setSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([{ id: "teacher-1" }]);
    prismaMock.announcement.create.mockResolvedValue({
      id: "ann-2",
      authorId: "user-1",
      title: "O'qituvchilar uchun",
      body: "Kengash",
      audience: { roles: ["TEACHER"] },
    });

    const res = await POST(
      adminRequest({
        title: "O'qituvchilar uchun",
        body: "Kengash",
        audience: { roles: ["TEACHER"] },
      }),
    );
    const body = (await res.json()) as { ok: boolean };

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: { in: ["TEACHER"] } }),
      }),
    );
    expect(prismaMock.announcement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audience: { roles: ["TEACHER"] },
        }),
      }),
    );
  });

  it("admin bo'lmagan foydalanuvchi 403 oladi", async () => {
    setSession("STUDENT");
    prismaMock.user.findMany.mockResolvedValue([]);

    const res = await POST(adminRequest({ title: "Test", body: "Test" }));
    const body = (await res.json()) as { ok: boolean; error: string };

    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(prismaMock.announcement.create).not.toHaveBeenCalled();
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("GET ro'yxat faqat global (courseId null) e'lonlarni qaytaradi", async () => {
    setSession("ADMIN");
    prismaMock.announcement.findMany.mockResolvedValue([
      {
        id: "ann-1",
        courseId: null,
        title: "Global",
        body: "Matn",
        createdAt: new Date(),
        author: { id: "user-1", name: "Admin", email: "a@ttpu.uz" },
      },
    ]);

    const res = await GET();
    const body = (await res.json()) as {
      ok: boolean;
      data: { announcements: Array<{ id: string }> };
    };

    expect(res.status).toBe(200);
    expect(prismaMock.announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: null } }),
    );
    expect(body.data.announcements[0].id).toBe("ann-1");
  });

  it("GET admin bo'lsa ham 403", async () => {
    setSession("TEACHER");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("zod validatsiyasi: bo'sh sarlavha 400", async () => {
    setSession("ADMIN");
    const res = await POST(adminRequest({ title: "  ", body: "Matn" }));
    expect(res.status).toBe(400);
    expect(prismaMock.announcement.create).not.toHaveBeenCalled();
  });

  it("audit log ANNOUNCEMENT_CREATE yoziladi", async () => {
    setSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([{ id: "student-1" }]);
    prismaMock.announcement.create.mockResolvedValue({
      id: "ann-3",
      title: "Audit test",
      body: "Matn",
    });

    await POST(adminRequest({ title: "Audit test", body: "Matn" }));

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ANNOUNCEMENT_CREATE",
          entity: "Announcement",
          entityId: "ann-3",
        }),
      }),
    );
  });
});
