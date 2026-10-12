import { describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// createAuditLog reads the session via next/headers; stub it so the
// route can be called outside a Next request scope.
vi.mock("next/headers", async () => {
  const store = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (name: string) =>
        store.has(name) ? { name, value: store.get(name) } : undefined,
      set: (name: string, value: string) => void store.set(name, value),
      delete: (name: string) => void store.delete(name),
    }),
  };
});

const { POST } = await import("@/app/api/auth/register/route");

process.env.AUTH_SECRET = "ttpu-test-secret";

function registerRequest(email: string, password = "uzunparol123") {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Student", email, password }),
  });
}

describe("register route (duplicate email)", () => {
  it("mavjud email: user.create CHAQIRILMAYDI, 201 {ok, id:'exists'} qaytadi", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existing-user",
      email: "taken@ttpu.uz",
      name: "Existing",
      role: "STUDENT",
      isActive: true,
    });
    prismaMock.user.create.mockResolvedValue({ id: "should-not-happen" });

    const res = await POST(registerRequest("taken@ttpu.uz"));
    const body = (await res.json()) as {
      ok: boolean;
      user: { id: string; name: string; role: string };
    };

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe("exists");
    expect(body.user.name).toBe("");
    expect(body.user.role).toBe("STUDENT");
  });

  it("yangi email: user.create CHAQIRILADI (normal flow buzilmagan)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "new-user",
      name: "Test Student",
      role: "STUDENT",
      email: "new@ttpu.uz",
      sessionEpoch: 0,
    });

    const res = await POST(registerRequest("new@ttpu.uz"));
    const body = (await res.json()) as { ok: boolean; user: { id: string } };

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe("new-user");
  });
});
