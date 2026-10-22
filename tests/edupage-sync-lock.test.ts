import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw, executeRaw, fetchTimetable } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  fetchTimetable: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: queryRaw, $executeRaw: executeRaw },
}));

vi.mock("@/lib/edupage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edupage")>();
  return { ...actual, fetchEduPageTimetable: fetchTimetable };
});

import { EduPageSyncBusyError, syncEduPageSchedule } from "@/lib/edupage-sync";

describe("EduPage sync lock", () => {
  beforeEach(() => {
    queryRaw.mockReset();
    executeRaw.mockReset();
    fetchTimetable.mockReset();
  });

  it("band qulf bo'lsa sinxron boshlanmaydi", async () => {
    queryRaw.mockResolvedValue([]);

    await expect(syncEduPageSchedule()).rejects.toBeInstanceOf(EduPageSyncBusyError);

    expect(fetchTimetable).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("xato bo'lsa ham qulf bo'shatiladi", async () => {
    queryRaw.mockResolvedValue([{ key: "edupage:sync-lock" }]);
    fetchTimetable.mockRejectedValue(new Error("EduPage javob bermadi"));

    await expect(syncEduPageSchedule()).rejects.toThrow("EduPage javob bermadi");

    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it("qulfni bo'shatishdagi xato asosiy xatoni yashirmaydi", async () => {
    queryRaw.mockResolvedValue([{ key: "edupage:sync-lock" }]);
    fetchTimetable.mockRejectedValue(new Error("asosiy xato"));
    executeRaw.mockRejectedValue(new Error("db xatosi"));

    await expect(syncEduPageSchedule()).rejects.toThrow("asosiy xato");
  });
});
