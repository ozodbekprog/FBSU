import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchEduPageTimetable,
  findEduPageClass,
  formatTeacherName,
  normalizeClassName,
  staffGivenKey,
  teacherGivenKey,
  teacherKeyMatches,
  teacherMatchKey,
} from "@/lib/edupage";

const viewerPayload = {
  r: {
    regular: {
      default_num: "462",
      timetables: [
        { tt_num: "462", year: 2026, text: "week 9 (12.10.2026-18.10.2026)", datefrom: "2026-10-11" },
      ],
    },
  },
};

const regularPayload = {
  r: {
    dbiAccessorRes: {
      tables: [
        {
          id: "globals",
          data_rows: [{ id: "1", tt_datefrom: "Validity: 11/10/2026-18/10/2026" }],
        },
        {
          id: "periods",
          data_rows: [
            { id: "2", period: "2", starttime: "10:30", endtime: "11:50" },
            { id: "1", period: "1", starttime: "09:00", endtime: "10:20" },
          ],
        },
        {
          id: "days",
          data_rows: [
            { id: "0", name: "Monday" },
            { id: "1", name: "Tuesday" },
            { id: "2", name: "Wednesday" },
            { id: "3", name: "Thursday" },
            { id: "4", name: "Friday" },
            { id: "5", name: "Saturday" },
          ],
        },
        {
          id: "classes",
          data_rows: [
            { id: "*140", name: "AI2-26" },
            { id: "*99", name: "IT2-26" },
          ],
        },
        {
          id: "subjects",
          data_rows: [
            { id: "*790", name: "Programming (prac)", short: "PROG (prac)", color: "#FF5050" },
            { id: "*791", name: "Physics I (lec)", short: "PHY (lec)", color: "#20C000" },
          ],
        },
        {
          id: "teachers",
          data_rows: [
            { id: "*12", name: "MAMANAZAROV AZIZBEK" },
            { id: "*24", name: "KHABIBULLAEV KHAMIDULLA" },
          ],
        },
        {
          id: "classrooms",
          data_rows: [
            { id: "*44", name: "LAB 403" },
            { id: "*45", name: "Yellow Hall" },
          ],
        },
        {
          id: "groups",
          data_rows: [
            { id: "*809", name: "Entire class", classid: "*140" },
            { id: "*810", name: "Group 1", classid: "*140" },
            { id: "*811", name: "Entire class", classid: "*99" },
          ],
        },
        {
          id: "lessons",
          data_rows: [
            {
              id: "*301",
              subjectid: "*790",
              teacherids: ["*24", "-24"],
              classids: ["*140"],
              groupids: ["*809"],
            },
            {
              id: "*302",
              subjectid: "*791",
              teacherids: ["*12"],
              classids: ["*140"],
              groupids: ["*810"],
            },
            {
              id: "*303",
              subjectid: "*791",
              teacherids: ["*12"],
              classids: ["*140", "*99"],
              groupids: ["*809", "*811"],
            },
            {
              id: "*304",
              subjectid: "*790",
              teacherids: [],
              classids: ["*140"],
              groupids: [],
            },
          ],
        },
        {
          id: "cards",
          data_rows: [
            { id: "*1", lessonid: "*301", period: "1", days: "100000", weeks: "1", classroomids: ["*44"] },
            { id: "*2", lessonid: "*302", period: "2", days: "000010", weeks: "1", classroomids: ["*45"] },
            { id: "*3", lessonid: "*303", period: "2", days: "100001", weeks: "1", classroomids: ["-76"] },
            { id: "*4", lessonid: "*304", period: "", days: "", weeks: "1", classroomids: [] },
          ],
        },
      ],
    },
  },
};

function mockFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("getTTViewerData")) {
      return new Response(JSON.stringify(viewerPayload), { status: 200 });
    }
    if (url.includes("regularttGetData")) {
      return new Response(JSON.stringify(regularPayload), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EduPage nom moslashtirish", () => {
  it("EduPage F.I.Sh. dan qisqa ko'rinish yasaydi", () => {
    expect(formatTeacherName("MAMANAZAROV AZIZBEK")).toBe("A. Mamanazarov");
    expect(formatTeacherName("KHABIBULLAEV KHAMIDULLA")).toBe("K. Khabibullaev");
    expect(formatTeacherName("SMITH JOHN PAUL")).toBe("J. P. Smith");
    expect(formatTeacherName("NAZAROVA")).toBe("Nazarova");
  });

  it("kalitlar bir xil formatda chiqadi", () => {
    expect(teacherMatchKey("A. Mamanazarov")).toBe("MAMANAZAROV|A");
    expect(teacherMatchKey("MAMANAZAROV AZIZBEK")).toBe("MAMANAZAROV|A");
    expect(teacherMatchKey("KH. Khamidulla")).toBe("KHAMIDULLA|KH");
  });

  it("qisqa bosh harf bilan mos keladi", () => {
    expect(teacherKeyMatches("KHAMIDULLA|KH", "KHABIBULLAEV|K")).toBe(false);
    expect(teacherKeyMatches("KHAMIDULLA|KH", "KHAMIDULLA|K")).toBe(true);
    expect(teacherKeyMatches("MAMANAZAROV|A", teacherMatchKey("MAMANAZAROV AZIZBEK"))).toBe(true);
    expect(teacherKeyMatches("NAZAROVA|L", teacherMatchKey("NAZAROVA LOLA"))).toBe(true);
    expect(teacherKeyMatches("NAZAROVA|L", teacherMatchKey("NAZAROVA OLGA"))).toBe(false);
  });

  it("ism bo'yicha zaxira kalit chiqadi", () => {
    expect(teacherGivenKey("KHABIBULLAEV KHAMIDULLA")).toBe("KHAMIDULLA|K");
    expect(teacherGivenKey("A. Mamanazarov")).toBe("");
    expect(teacherGivenKey("NAZAROVA")).toBe("");
  });

  it("hisob nomidan ism kaliti olinadi", () => {
    expect(staffGivenKey("KH. Khamidulla")).toBe("KHAMIDULLA|KH");
    expect(staffGivenKey("A. Mamanazarov")).toBe("MAMANAZAROV|A");
    expect(staffGivenKey("Administrator")).toBe("");
    expect(teacherKeyMatches(staffGivenKey("KH. Khamidulla"), teacherGivenKey("KHABIBULLAEV KHAMIDULLA"))).toBe(
      true,
    );
  });

  it("sinf nomini topadi", () => {
    const classes = [
      { id: "*140", name: "AI2-26", lessonCount: 4 },
      { id: "*99", name: "IT2-26", lessonCount: 2 },
    ];
    expect(normalizeClassName("  AI2-26 ")).toBe("ai2-26");
    expect(findEduPageClass(classes, ["", null, "ai2-26"])?.id).toBe("*140");
    expect(findEduPageClass(classes, ["yo'q"])).toBeNull();
  });
});

describe("EduPage jadvalini o'qish", () => {
  it("jadval, kunlar va haftalik darslarni ajratadi", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const timetable = await fetchEduPageTimetable();

    expect(timetable.ttNum).toBe("462");
    expect(timetable.label).toContain("week 9");
    expect(timetable.validity).toContain("11/10/2026");
    expect(timetable.periods.map((item) => item.period)).toEqual([1, 2]);
    expect(timetable.days[0]).toBe("Monday");
    expect(timetable.classes.map((item) => item.name)).toEqual(["AI2-26", "IT2-26"]);

    const ai = timetable.lessons.filter((lesson) => lesson.className === "AI2-26");
    expect(ai).toHaveLength(4);

    const programming = ai.find((lesson) => lesson.subject === "Programming");
    expect(programming).toMatchObject({
      dayOfWeek: 1,
      slot: 1,
      subject: "Programming",
      lessonType: "Amaliy",
      teacher: "K. Khabibullaev",
      room: "LAB 403",
      subGroup: null,
      parity: null,
    });

    const lab = ai.find((lesson) => lesson.subGroup === "Group 1");
    expect(lab).toMatchObject({ dayOfWeek: 5, slot: 2, lessonType: "Ma'ruza", room: "Yellow Hall" });

    const lecture = ai.find((lesson) => lesson.slot === 2 && lesson.subGroup === null);
    expect(lecture).toMatchObject({ room: null, teacher: "A. Mamanazarov" });

    const it2 = timetable.lessons.filter((lesson) => lesson.className === "IT2-26");
    expect(it2).toHaveLength(2);
    expect(timetable.classes.find((item) => item.name === "IT2-26")?.lessonCount).toBe(2);
    expect(timetable.lessons.every((lesson) => lesson.slot > 0)).toBe(true);
    expect(new Set(timetable.lessons.map((lesson) => lesson.id)).size).toBe(timetable.lessons.length);
  });

  it("manba javob bermasa xato beradi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 })),
    );
    await expect(fetchEduPageTimetable()).rejects.toThrow(/EduPage/);
  });

  it("birinchi urinish uzilsa qayta urinadi", async () => {
    const base = mockFetch();
    let failures = 1;
    const flaky = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("getTTViewerData") && failures > 0) {
        failures -= 1;
        throw new Error("fetch failed");
      }
      return base(input);
    });
    vi.stubGlobal("fetch", flaky);

    const timetable = await fetchEduPageTimetable();
    expect(timetable.ttNum).toBe("462");
    expect(flaky.mock.calls.length).toBeGreaterThan(1);
  });

  it("jadval yo'q bo'lsa xato beradi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ r: { regular: { timetables: [] } } }), { status: 200 })),
    );
    await expect(fetchEduPageTimetable()).rejects.toThrow(/jadval/i);
  });
});
