import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createLabNote,
  createEmptyNote,
  createSketchNote,
  migrateLegacy,
  noteSnippet,
  newBlock,
  parseOpenboard,
  payloadBytes,
  searchNotes,
  stripHtml,
  touchNote,
} from "@/lib/openboard/store";
import { emptyOpenboard, type OpenboardNote } from "@/lib/openboard/types";

const prismaMock = {
  board: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

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

let sessionRole: string | null = "ADMIN";

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

process.env.AUTH_SECRET = "ttpu-test-secret";
process.env.CSRF_SECRET = "ttpu-test-secret";

const { SignJWT } = await import("jose");

const csrfSecret = new TextEncoder().encode("ttpu-test-secret");
const csrfToken = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(csrfSecret);

const { GET, PUT } = await import("@/app/api/openboard/route");

function boardRequest(body: unknown, withCsrf = true) {
  return new Request("http://localhost/api/openboard", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(withCsrf ? { "x-csrf-token": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
}

const validData = {
  v: 3,
  kind: "openboard",
  notes: [
    {
      id: "note-1",
      title: "Fizika",
      icon: "📘",
      blocks: [{ id: "b-1", type: "text", html: "<p>Salom</p>" }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
};

const bigData = {
  v: 3,
  kind: "openboard",
  notes: [
    {
      id: "note-big",
      title: "Katta",
      icon: "",
      blocks: Array.from({ length: 80 }, (_, i) => ({
        id: `b-${i}`,
        type: "text",
        html: "x".repeat(120_000),
      })),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionRole = "ADMIN";
  cookieStore.set("csrf_token", csrfToken);
  prismaMock.board.findFirst.mockResolvedValue(null);
  prismaMock.board.update.mockResolvedValue({
    id: "board-1",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  prismaMock.board.create.mockResolvedValue({
    id: "board-new",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
});

describe("migrateLegacy", () => {
  it("null/undefined → bo'sh openboard, needsSave=false", () => {
    for (const raw of [null, undefined]) {
      const res = migrateLegacy(raw, "Eski");
      expect(res.data).toEqual(emptyOpenboard());
      expect(res.needsSave).toBe(false);
    }
  });

  it("v2 excalidraw → bitta drawing note, needsSave=true", () => {
    const res = migrateLegacy(
      { v: 2, kind: "excalidraw", elements: [{ id: "e1" }] },
      "Eski chizma",
    );
    expect(res.needsSave).toBe(true);
    expect(res.data.v).toBe(3);
    expect(res.data.kind).toBe("openboard");
    expect(res.data.notes).toHaveLength(1);
    const note = res.data.notes[0];
    expect(note.title).toBe("Eski chizma");
    expect(note.icon).toBe("✏️");
    expect(note.blocks).toHaveLength(1);
    expect(note.blocks[0]).toMatchObject({
      type: "drawing",
      scene: [{ id: "e1" }],
      sceneAppState: { viewBackgroundColor: "#ffffff" },
    });
  });

  it("v3 valid → needsSave=false, o'zgartirilmaydi", () => {
    const res = migrateLegacy(validData, "Eski");
    expect(res.needsSave).toBe(false);
    expect(res.data.notes[0].title).toBe("Fizika");
  });

  it("noma'lum shakl → bo'sh openboard, needsSave=false", () => {
    for (const raw of ["matn", 42, {}, { v: 9, kind: "x" }, []]) {
      const res = migrateLegacy(raw, "Eski");
      expect(res.data).toEqual(emptyOpenboard());
      expect(res.needsSave).toBe(false);
    }
  });
});

describe("createEmptyNote / createSketchNote", () => {
  it("createEmptyNote — bitta bo'sh text blok", () => {
    const note = createEmptyNote("Yangi");
    expect(note.title).toBe("Yangi");
    expect(note.blocks).toHaveLength(1);
    expect(note.blocks[0]).toMatchObject({ type: "text", html: "" });
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it("createSketchNote — bitta drawing blok", () => {
    const note = createSketchNote("Chizma");
    expect(note.icon).toBe("✏️");
    expect(note.blocks).toHaveLength(1);
    expect(note.blocks[0]).toMatchObject({
      type: "drawing",
      scene: [],
      sceneAppState: { viewBackgroundColor: "#ffffff" },
    });
  });
});

describe("createLabNote bloklar tartibi", () => {
  const labels = {
    goal: "Maqsad",
    equipment: "Jihozlar",
    steps: "Bosqichlar",
    measurements: "O'lchovlar",
    calculation: "Hisoblash",
    conclusion: "Xulosa",
    simLink: "Simulyatsiya",
  };

  it("13 blok, SPEC tartibida", () => {
    const note = createLabNote("Lab 1", labels);
    expect(note.title).toBe("Lab 1");
    expect(note.blocks).toHaveLength(13);
    const types = note.blocks.map((b) => b.type);
    expect(types).toEqual([
      "heading",
      "text",
      "heading",
      "text",
      "heading",
      "checklist",
      "heading",
      "table",
      "heading",
      "formula",
      "heading",
      "text",
      "text",
    ]);
    const headings = note.blocks.filter(
      (b) => b.type === "heading",
    ) as { html: string }[];
    expect(headings.map((h) => h.html)).toEqual([
      labels.goal,
      labels.equipment,
      labels.steps,
      labels.measurements,
      labels.calculation,
      labels.conclusion,
    ]);
  });

  it("checklist 3 ta bo'sh band, table 3×3 header=true, oxirgi text sim havolasi", () => {
    const note = createLabNote("Lab 1", labels);
    const checklist = note.blocks[5];
    if (checklist.type !== "checklist") throw new Error("kutilmagan blok");
    expect(checklist.items).toHaveLength(3);
    for (const item of checklist.items) {
      expect(item.text).toBe("");
      expect(item.done).toBe(false);
    }
    const table = note.blocks[7];
    if (table.type !== "table") throw new Error("kutilmagan blok");
    expect(table.header).toBe(true);
    expect(table.rows).toHaveLength(3);
    for (const row of table.rows) {
      expect(row).toHaveLength(3);
      for (const cell of row) expect(cell).toBe("");
    }
    const last = note.blocks[12];
    if (last.type !== "text") throw new Error("kutilmagan blok");
    expect(last.html).toBe('<a href="/labs">Simulyatsiya</a>');
  });

  it("barcha id lar unique va createdAt/updatedAt to'ldirilgan", () => {
    const note = createLabNote("Lab 1", labels);
    const ids = new Set<string>();
    for (const block of note.blocks) {
      expect(block.id.length).toBeGreaterThan(0);
      ids.add(block.id);
    }
    expect(ids.size).toBe(13);
    expect(note.createdAt).toBe(note.updatedAt);
    expect(note.createdAt.length).toBeGreaterThan(0);
  });
});

describe("stripHtml / noteSnippet", () => {
  it("stripHtml teglarni olib tashlaydi, &nbsp; probelga", () => {
    expect(stripHtml("<p>Salom <b>dunyo</b></p>")).toBe("Salom dunyo");
    expect(stripHtml("a&nbsp;b")).toBe("a b");
    expect(stripHtml("<div><span>  x  </span></div>")).toBe("x");
  });

  it("noteSnippet — text/heading lardan 90 belgi", () => {
    const long = "s".repeat(120);
    const note: OpenboardNote = {
      id: "n",
      title: "T",
      icon: "",
      blocks: [{ id: "b", type: "text", html: `<p>${long}</p>` }],
      createdAt: "",
      updatedAt: "",
    };
    expect(noteSnippet(note)).toBe(long.slice(0, 90));
    const headingNote: OpenboardNote = {
      ...note,
      blocks: [
        { id: "b1", type: "heading", html: "Sarlavha", level: 2 },
        { id: "b2", type: "text", html: "Matn" },
      ],
    };
    expect(noteSnippet(headingNote)).toBe("Sarlavha Matn");
  });
});

describe("searchNotes", () => {
  const notes: OpenboardNote[] = [
    {
      id: "n1",
      title: "Fizika",
      icon: "",
      blocks: [{ id: "b1", type: "text", html: "<p>Nyuton qonuni</p>" }],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "n2",
      title: "Matematika",
      icon: "",
      blocks: [{ id: "b2", type: "text", html: "<p>Integral</p>" }],
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("bo'sh query — hammasini qaytaradi", () => {
    expect(searchNotes(notes, "")).toHaveLength(2);
    expect(searchNotes(notes, "   ")).toHaveLength(2);
  });

  it("title va snippet bo'yicha topadi, reyestr hisobga olinadi", () => {
    expect(searchNotes(notes, "fizika")).toHaveLength(1);
    expect(searchNotes(notes, "nyuton")).toHaveLength(1);
    expect(searchNotes(notes, "integral")).toHaveLength(1);
    expect(searchNotes(notes, "geometriya")).toHaveLength(0);
  });
});

describe("touchNote / parseOpenboard / payloadBytes", () => {
  it("touchNote — updatedAt yangilangan nusxa", () => {
    const note: OpenboardNote = {
      id: "n",
      title: "T",
      icon: "",
      blocks: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const touched = touchNote(note, "2026-05-05T00:00:00.000Z");
    expect(touched.updatedAt).toBe("2026-05-05T00:00:00.000Z");
    expect(note.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(touched.title).toBe("T");
  });

  it("parseOpenboard — ok/false", () => {
    expect(parseOpenboard(validData)).toEqual({ ok: true, data: validData });
    const bad = parseOpenboard({ v: 2 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(typeof bad.error).toBe("string");
  });

  it("payloadBytes — UTF-8 byte uzunligi", () => {
    expect(payloadBytes(null)).toBe(4);
    expect(payloadBytes({ a: "b" })).toBe(9);
    expect(payloadBytes("é")).toBe(4);
  });
});

describe("newBlock", () => {
  it("har bir tip uchun default bloklar", () => {
    expect(newBlock("text")).toEqual({ id: expect.any(String), type: "text", html: "" });
    expect(newBlock("heading")).toEqual({
      id: expect.any(String),
      type: "heading",
      html: "",
      level: 2,
    });
    expect(newBlock("heading", "1")).toMatchObject({ type: "heading", level: 1 });
    expect(newBlock("heading", "3")).toMatchObject({ type: "heading", level: 3 });
    expect(newBlock("heading", "9")).toMatchObject({ type: "heading", level: 2 });
    expect(newBlock("code")).toEqual({
      id: expect.any(String),
      type: "code",
      lang: "javascript",
      source: "",
    });
    expect(newBlock("code", "python")).toMatchObject({ lang: "python" });
    expect(newBlock("code", "bad")).toMatchObject({ lang: "javascript" });
    expect(newBlock("formula")).toEqual({
      id: expect.any(String),
      type: "formula",
      tex: "",
    });
    expect(newBlock("chem")).toEqual({ id: expect.any(String), type: "chem", tex: "" });
    expect(newBlock("drawing")).toEqual({
      id: expect.any(String),
      type: "drawing",
      scene: [],
    });
    expect(newBlock("image")).toEqual({
      id: expect.any(String),
      type: "image",
      src: "",
      alt: "",
    });
    expect(newBlock("table")).toEqual({
      id: expect.any(String),
      type: "table",
      header: true,
      rows: [["", ""], ["", ""], ["", ""]],
    });
    expect(newBlock("checklist")).toEqual({
      id: expect.any(String),
      type: "checklist",
      items: [],
    });
    expect(newBlock("noma'lum")).toEqual({
      id: expect.any(String),
      type: "text",
      html: "",
    });
  });
});

describe("API /api/openboard", () => {
  it("GET — board topilsa { ok, data: { data, updatedAt } }", async () => {
    prismaMock.board.findFirst.mockResolvedValueOnce({
      data: validData,
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
    const res = await GET();
    const body = (await res.json()) as {
      ok: boolean;
      data: { data: unknown; updatedAt: string | null };
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.data).toEqual(validData);
    expect(body.data.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    const where = prismaMock.board.findFirst.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: Record<string, string>;
    };
    expect(where.where).toEqual({ userId: "admin-1", assignmentId: null });
    expect(where.orderBy).toEqual({ updatedAt: "desc" });
  });

  it("GET — board yo'q bo'lsa data/updatedAt null", async () => {
    const res = await GET();
    const body = (await res.json()) as {
      ok: boolean;
      data: { data: null; updatedAt: null };
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.data).toBeNull();
    expect(body.data.updatedAt).toBeNull();
  });

  it("GET — auth yo'q bo'lsa 401", async () => {
    sessionRole = null;
    const res = await GET();
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(prismaMock.board.findFirst).not.toHaveBeenCalled();
  });

  it("PUT — mavjud row yo'q bo'lsa create, { ok, data: { updatedAt } }", async () => {
    const res = await PUT(boardRequest({ data: validData }));
    const body = (await res.json()) as { ok: boolean; data: { updatedAt: string } };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.updatedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(prismaMock.board.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.board.create.mock.calls[0][0] as {
      data: { userId: string; assignmentId: null; data: unknown };
    };
    expect(createArg.data.userId).toBe("admin-1");
    expect(createArg.data.assignmentId).toBeNull();
    expect(createArg.data.data).toEqual(validData);
    expect(prismaMock.board.update).not.toHaveBeenCalled();
  });

  it("PUT — mavjud row bo'lsa update", async () => {
    prismaMock.board.findFirst.mockResolvedValueOnce({ id: "board-1" });
    const res = await PUT(boardRequest({ data: validData }));
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(prismaMock.board.update).toHaveBeenCalledTimes(1);
    const updateArg = prismaMock.board.update.mock.calls[0][0] as {
      where: { id: string };
      data: { data: unknown };
    };
    expect(updateArg.where).toEqual({ id: "board-1" });
    expect(updateArg.data.data).toEqual(validData);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it("PUT — auth yo'q bo'lsa 401", async () => {
    sessionRole = null;
    const res = await PUT(boardRequest({ data: validData }));
    expect(res.status).toBe(401);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it("PUT — CSRF token yo'q bo'lsa 403", async () => {
    const res = await PUT(boardRequest({ data: validData }, false));
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it("PUT — schema bo'yicha noto'g'ri data bo'lsa 400", async () => {
    const res = await PUT(boardRequest({ data: { v: 2, kind: "excalidraw" } }));
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });

  it("PUT — body { data } shaklida bo'lmasa 400", async () => {
    const res = await PUT(
      new Request("http://localhost/api/openboard", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ wrong: true }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PUT — payload 9MB dan katta bo'lsa 413", async () => {
    expect(payloadBytes(bigData)).toBeGreaterThan(9_000_000);
    const res = await PUT(boardRequest({ data: bigData }));
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(413);
    expect(body.ok).toBe(false);
    expect(prismaMock.board.create).not.toHaveBeenCalled();
  });
});
