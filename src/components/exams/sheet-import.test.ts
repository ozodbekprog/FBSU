import { describe, expect, it } from "vitest";
import { matchStudents, normalizeName, parseNameList } from "./sheet-import";

const ENROLLED = [
  { id: "s1", name: "Aziz Karimov" },
  { id: "s2", name: "Dilnoza Karimova" },
  { id: "s3", name: "G'ulomov Bekzod" },
  { id: "s4", name: "Karim Ismoilov" },
];

describe("parseNameList", () => {
  it("raqamlashni olib tashlaydi", () => {
    expect(parseNameList("1. Aziz Karimov\n2) Dilnoza Karimova").map((r) => r.input)).toEqual([
      "Aziz Karimov",
      "Dilnoza Karimova",
    ]);
  });

  it("chiziqcha va • bilan boshlangan qatorlarni oladi", () => {
    expect(parseNameList("- Aziz Karimov\n• Dilnoza Karimova").map((r) => r.input)).toEqual([
      "Aziz Karimov",
      "Dilnoza Karimova",
    ]);
  });

  it("TAB bilan ajratilgan joy raqamini oladi", () => {
    const rows = parseNameList("Aziz Karimov\tA-12");
    expect(rows[0].input).toBe("Aziz Karimov");
    expect(rows[0].seat).toBe("A-12");
  });

  it("bo'sh qatorlarni tashlaydi", () => {
    expect(parseNameList("\n\nAziz Karimov\n\n\n")).toHaveLength(1);
  });
});

describe("normalizeName", () => {
  it("apostrof variantlarini birlashtiradi", () => {
    expect(normalizeName("Gʻulomov")).toBe(normalizeName("G'ulomov"));
    expect(normalizeName("G'ulomov")).toBe(normalizeName("G‘ulomov"));
  });

  it("registr va ortiqcha bo'shliqni tashlaydi", () => {
    expect(normalizeName("  AZIZ   Karimov ")).toBe("aziz karimov");
  });

  it("tinish belgilarini olib tashlaydi", () => {
    expect(normalizeName("Karimov, Aziz.")).toBe("karimov aziz");
  });
});

describe("matchStudents", () => {
  it("to'liq ism bo'yicha topadi", () => {
    const r = matchStudents([{ input: "Aziz Karimov" }], ENROLLED);
    expect(r.matched.map((m) => m.studentId)).toEqual(["s1"]);
    expect(r.unmatched).toEqual([]);
  });

  it("teskari tartibni ham topadi (Familiya Ism)", () => {
    const r = matchStudents([{ input: "Karimov Aziz" }], ENROLLED);
    expect(r.matched.map((m) => m.studentId)).toEqual(["s1"]);
  });

  it("apostrof farqini hisobga oladi", () => {
    const r = matchStudents([{ input: "Gʻulomov Bekzod" }], ENROLLED);
    expect(r.matched.map((m) => m.studentId)).toEqual(["s3"]);
  });

  it("takroriy qatorni ikki marta qo'shmaydi", () => {
    const r = matchStudents([{ input: "Aziz Karimov" }, { input: "Karimov Aziz" }], ENROLLED);
    expect(r.matched).toHaveLength(1);
  });

  it("topilmagan ismni unmatched ga qo'yadi", () => {
    const r = matchStudents([{ input: "Mavjud Emas" }], ENROLLED);
    expect(r.matched).toEqual([]);
    expect(r.unmatched).toEqual(["Mavjud Emas"]);
  });

  it("faqat familiya bo'yicha ham topadi", () => {
    // Familiya ismning OXIRIDA turadi — faqat birinchi so'z bo'yicha
    // izlash bu holatni o'tkazib yuborardi.
    const r = matchStudents([{ input: "G'ulomov" }], ENROLLED);
    expect(r.matched.map((m) => m.studentId)).toEqual(["s3"]);
  });

  it("bir nechta mos kelsa — ambiguous", () => {
    const enrolled = [
      { id: "a", name: "Karimov Aziz" },
      { id: "b", name: "Karimov Bekzod" },
    ];
    const r = matchStudents([{ input: "Karimov" }], enrolled);
    expect(r.ambiguous).toHaveLength(1);
    expect(r.ambiguous[0].candidates).toHaveLength(2);
  });

  it("joy raqamini natijaga o'tkazadi", () => {
    const r = matchStudents([{ input: "Aziz Karimov", seat: "A-12" }], ENROLLED);
    expect(r.matched[0].seat).toBe("A-12");
  });
});
