import { describe, expect, it, vi } from "vitest";

/**
 * Backup + maintenance testlari.
 *
 * Prisma mock: route'larning select maydonlari va upsert chaqiriqlari
 * haqiqiy prisma orqali emas, mock orqali tekshiriladi.
 */

const userFindMany = vi.fn();
const groupFindMany = vi.fn();
const facultyFindMany = vi.fn();
const departmentFindMany = vi.fn();
const subjectFindMany = vi.fn();
const courseFindMany = vi.fn();
const contractFindMany = vi.fn();
const paymentFindMany = vi.fn();
const userCount = vi.fn();
const groupCount = vi.fn();
const facultyCount = vi.fn();
const departmentCount = vi.fn();
const subjectCount = vi.fn();
const courseCount = vi.fn();
const contractCount = vi.fn();
const paymentCount = vi.fn();
const appSettingFindUnique = vi.fn();
const appSettingUpsert = vi.fn();
const auditLogCreate = vi.fn();

const prismaMock = {
  user: { findMany: userFindMany, count: userCount },
  group: { findMany: groupFindMany, count: groupCount },
  faculty: { findMany: facultyFindMany, count: facultyCount },
  department: { findMany: departmentFindMany, count: departmentCount },
  subject: { findMany: subjectFindMany, count: subjectCount },
  course: { findMany: courseFindMany, count: courseCount },
  contract: { findMany: contractFindMany, count: contractCount },
  payment: { findMany: paymentFindMany, count: paymentCount },
  appSetting: { findUnique: appSettingFindUnique, upsert: appSettingUpsert },
  auditLog: { create: auditLogCreate },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Route'lar getCurrentUser orqali sessiyani o'qiydi — cookie store mock.
const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
    set: (name: string, value: string) => void cookieStore.set(name, value),
    delete: (name: string) => void cookieStore.delete(name),
  }),
}));

vi.mock("@/lib/client-ip", () => ({
  getClientIp: () => "127.0.0.1",
}));

// auth: getCurrentUser — sessiya cookie'siga qarab admin/student qaytaradi.
let currentRole: "ADMIN" | "STUDENT" | null = null;
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () =>
    currentRole ? { id: "u-admin", role: currentRole, name: "Tester", email: "t@t.uz" } : null,
  requireRole: async () => {
    if (!currentRole) throw new Error("no session");
    return { id: "u-admin", role: currentRole, name: "Tester" };
  },
}));

process.env.AUTH_SECRET = "ttpu-test-secret";

const { GET: backupGet } = await import("@/app/api/admin/backup/route");
const { GET: statsGet } = await import("@/app/api/admin/backup/stats/route");
const { GET: maintenanceGet, POST: maintenancePost } = await import(
  "@/app/api/admin/maintenance/route"
);
const { getMaintenanceMode } = await import("@/server/maintenance");

function jsonRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

function setSession(role: "ADMIN" | "STUDENT" | null) {
  currentRole = role;
  cookieStore.clear();
  if (role) cookieStore.set("ttpu_session", "mock-token");
}

const USERS_ROWS = [
  {
    id: "u1",
    email: "admin@t.uz",
    name: "Admin",
    role: "ADMIN",
    passwordHash: "SECRET_HASH_MUST_NOT_APPEAR",
    sessionEpoch: 7,
    faceDescriptor: { vector: [1, 2, 3] },
  },
  {
    id: "u2",
    email: "student@t.uz",
    name: "Student",
    role: "STUDENT",
    passwordHash: "SECRET_HASH_STUDENT",
    sessionEpoch: 9,
  },
];

function mockSnapshotData() {
  // Real prisma kabi: findMany(select) faqat select'dagi maydonlarni qaytaradi.
  userFindMany.mockImplementation(async (args?: { select?: Record<string, boolean> }) =>
    USERS_ROWS.map((row) => {
      if (!args?.select) return row;
      const select = args?.select;
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => select !== undefined && key in select),
      );
    }),
  );
  groupFindMany.mockResolvedValue([{ id: "g1", name: "G1" }]);
  facultyFindMany.mockResolvedValue([{ id: "f1", name: "F" }]);
  departmentFindMany.mockResolvedValue([]);
  subjectFindMany.mockResolvedValue([{ id: "s1", name: "S" }]);
  courseFindMany.mockResolvedValue([{ id: "c1", name: "C" }]);
  contractFindMany.mockResolvedValue([]);
  paymentFindMany.mockResolvedValue([]);
}

function resetMocks() {
  vi.clearAllMocks();
  appSettingFindUnique.mockResolvedValue(null);
  appSettingUpsert.mockResolvedValue({ key: "maintenance_mode", value: false });
  auditLogCreate.mockResolvedValue({ id: "log1" });
}

describe("backup export (ADMIN)", () => {
  it("ADMIN eksport yuklab oladi: 200 + Content-Disposition attachment", async () => {
    resetMocks();
    setSession("ADMIN");
    mockSnapshotData();

    const res = await backupGet(
      jsonRequest("http://localhost/api/admin/backup"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/attachment/);

    const body = (await res.json()) as {
      exportedAt: string;
      counts: Record<string, number>;
      data: { users: Array<Record<string, unknown>> };
    };
    expect(body.counts.users).toBe(2);
    expect(body.data.users.length).toBe(2);
  });

  it("eksport javobida passwordHash/sessionEpoch/faceDescriptor Yo'Q (select bilan cheklash)", async () => {
    resetMocks();
    setSession("ADMIN");
    mockSnapshotData();

    // select orqali so'ralgan maydonlar tekshiriladi
    const snapshot = await import("@/app/api/admin/backup/data");
    const data = await snapshot.getBackupSnapshot();
    const userSelect = userFindMany.mock.calls[0][0] as { select: Record<string, boolean> };
    const selected = Object.keys(userSelect.select);

    expect(selected).not.toContain("passwordHash");
    expect(selected).not.toContain("sessionEpoch");
    expect(selected).not.toContain("faceDescriptor");
    expect(selected).not.toContain("faceEnrolledAt");

    // va JSON ichida ham sezgir maydonlar yo'q
    for (const row of data.data.users as Array<Record<string, unknown>>) {
      expect(row).not.toHaveProperty("passwordHash");
      expect(row).not.toHaveProperty("sessionEpoch");
      expect(row).not.toHaveProperty("faceDescriptor");
    }
    const json = JSON.stringify(data);
    expect(json).not.toContain("SECRET_HASH");
    expect(json).not.toContain("faceDescriptor");
  });

  it("nom-admin: 403 Forbidden", async () => {
    resetMocks();
    setSession("STUDENT");
    mockSnapshotData();

    const res = await backupGet(
      jsonRequest("http://localhost/api/admin/backup"),
    );
    expect(res.status).toBe(403);
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("stats endpoint: faqat counts qaytadi", async () => {
    resetMocks();
    setSession("ADMIN");
    userCount.mockResolvedValue(42);
    groupCount.mockResolvedValue(7);
    facultyCount.mockResolvedValue(2);
    departmentCount.mockResolvedValue(5);
    subjectCount.mockResolvedValue(11);
    courseCount.mockResolvedValue(3);
    contractCount.mockResolvedValue(9);
    paymentCount.mockResolvedValue(100);

    const res = await statsGet();
    const body = (await res.json()) as {
      ok: boolean;
      data: { counts: Record<string, number> };
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.counts).toEqual({
      users: 42,
      groups: 7,
      faculties: 2,
      departments: 5,
      subjects: 11,
      courses: 3,
      contracts: 9,
      payments: 100,
    });
    // stats — ma'lumotlar o'zi yo'q
    expect(body.data).not.toHaveProperty("data");
  });

  it("eksportda BACKUP_EXPORT audit yoziladi", async () => {
    resetMocks();
    setSession("ADMIN");
    mockSnapshotData();

    await backupGet(jsonRequest("http://localhost/api/admin/backup"));
    expect(auditLogCreate).toHaveBeenCalledTimes(1);
    const [input] = auditLogCreate.mock.calls[0] as Array<{
      data: { action: string; actorId: string | null };
    }>;
    expect(input.data.action).toBe("BACKUP_EXPORT");
    expect(input.data.actorId).toBe("u-admin");
  });
});

describe("maintenance mode", () => {
  it("POST {enabled:true} — ADMIN: AppSetting upsert + MAINTENANCE_TOGGLE audit", async () => {
    resetMocks();
    setSession("ADMIN");
    appSettingUpsert.mockResolvedValue({ key: "maintenance_mode", value: true });

    const res = await maintenancePost(
      jsonRequest("http://localhost/api/admin/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      }),
    );
    const body = (await res.json()) as { ok: boolean; data: { enabled: boolean } };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.enabled).toBe(true);
    expect(appSettingUpsert).toHaveBeenCalledWith({
      where: { key: "maintenance_mode" },
      create: { key: "maintenance_mode", value: true },
      update: { value: true },
    });
    const [logInput] = auditLogCreate.mock.calls[0] as Array<{
      data: { action: string; meta?: Record<string, unknown> };
    }>;
    expect(logInput.data.action).toBe("MAINTENANCE_TOGGLE");
  });

  it("POST — nom-admin: 403, upsert CHAQIRILMAYDI", async () => {
    resetMocks();
    setSession("STUDENT");

    const res = await maintenancePost(
      jsonRequest("http://localhost/api/admin/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      }),
    );
    expect(res.status).toBe(403);
    expect(appSettingUpsert).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  it("POST — noto'g'ri body: 400", async () => {
    resetMocks();
    setSession("ADMIN");

    const res = await maintenancePost(
      jsonRequest("http://localhost/api/admin/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    expect(appSettingUpsert).not.toHaveBeenCalled();
  });

  it("getMaintenanceMode: kalit yo'q -> false; value true -> true; xato -> false", async () => {
    resetMocks();
    setSession("ADMIN");

    appSettingFindUnique.mockResolvedValue(null);
    expect(await getMaintenanceMode()).toBe(false);

    appSettingFindUnique.mockResolvedValue({ key: "maintenance_mode", value: true });
    expect(await getMaintenanceMode()).toBe(true);

    appSettingFindUnique.mockRejectedValue(new Error("db down"));
    expect(await getMaintenanceMode()).toBe(false);
  });

  it("enforcement logikasi (unit daraja): maintenance faqat role !== ADMIN uchun blok", async () => {
    resetMocks();

    // maintenance yoqilgan
    appSettingFindUnique.mockResolvedValue({ key: "maintenance_mode", value: true });

    // nom-admin uchun layout bloklaydi: role tekshiruvi true
    const nonAdminRoles: string[] = ["STUDENT", "TEACHER", "REGISTRAR", "REKTOR"];
    for (const role of nonAdminRoles) {
      const blocked = role !== "ADMIN" && (await getMaintenanceMode());
      expect(blocked).toBe(true);
    }

    // ADMIN uchun bloklanmaydi
    const adminBlocked = "ADMIN" !== "ADMIN" && (await getMaintenanceMode());
    expect(adminBlocked).toBe(false);

    // maintenance o'chirilgan
    appSettingFindUnique.mockResolvedValue(null);
    const anyRole: string = "STUDENT";
    const studentBlocked = anyRole !== "ADMIN" && (await getMaintenanceMode());
    expect(studentBlocked).toBe(false);
  });
});
