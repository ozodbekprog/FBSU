import { describe, expect, it } from "vitest";
import {
  findPairs,
  jaccard,
  maxScoreByItem,
  normalizeText,
  shingleSet,
  similarity,
  tokenize,
} from "./similarity";

const words = (start: number, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `w${start}_${index}`);

const longText = words(1, 60).join(" ");
const modifiedWords = words(1, 60);
modifiedWords[30] = "replaced_word";
const modifiedText = modifiedWords.join(" ");
const unrelatedText = words(900, 60).join(" ");

describe("normalizeText / tokenize", () => {
  it("tinish belgilarini bo'shliqqa almashtirib, kichik harfga keltiradi", () => {
    expect(normalizeText("Salom,   Dunyo!")).toBe("salom dunyo");
    expect(tokenize("Salom,   Dunyo!")).toEqual(["salom", "dunyo"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("shingleSet", () => {
  it("k ta ketma-ket tokenli shingllar hosil qiladi", () => {
    const tokens = ["a", "b", "c", "d", "e", "f"];
    expect(shingleSet(tokens, 5)).toEqual(
      new Set(["a b c d e", "b c d e f"]),
    );
  });

  it("tokenlar k dan kam bo'lsa bo'sh to'plam qaytaradi", () => {
    expect(shingleSet(["a", "b", "c"], 5).size).toBe(0);
  });
});

describe("jaccard", () => {
  it("bir xil to'plamlar uchun 1", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("qismdan mos keladigan to'plamlar uchun to'g'ri nisbat", () => {
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBeCloseTo(0.5, 5);
  });

  it("ikkala to'plam ham bo'sh bo'lsa 0", () => {
    expect(jaccard(new Set<string>(), new Set<string>())).toBe(0);
  });
});

describe("similarity", () => {
  it("bir xil matn uchun 1 qaytaradi", () => {
    expect(similarity(longText, longText)).toBe(1);
  });

  it("butunlay boshqa matnlar uchun 0 ga yaqin qiymat qaytaradi", () => {
    expect(similarity(longText, unrelatedText)).toBeLessThan(0.2);
  });

  it("bitta so'z almashtirilgan uzun matnlar ham o'xshash bo'ladi", () => {
    expect(similarity(longText, modifiedText)).toBeGreaterThan(0.8);
  });

  it("gap joylari almashingan matnlarda o'xshashlik saqlanadi", () => {
    const sentences = Array.from({ length: 8 }, (_, index) =>
      words(index * 10, 10).join(" "),
    );
    const original = sentences.join(" ");
    const reordered = [...sentences].reverse().join(" ");
    expect(similarity(original, reordered)).toBeGreaterThan(0.3);
  });

  it("juda qisqa matnlar uchun token to'plamlari bo'yicha ishlaydi", () => {
    expect(similarity("salom", "salom")).toBe(1);
    expect(similarity("salom", "salom dunyo")).toBeCloseTo(0.5, 5);
  });

  it("bo'sh matn uchun 0 qaytaradi", () => {
    expect(similarity("", unrelatedText)).toBe(0);
    expect(similarity("", "")).toBe(0);
  });

  it("natijani 0..1 oraliqida uch xonagacha yumroqlaydi", () => {
    const score = similarity(longText, modifiedText);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBe(Math.round(score * 1000) / 1000);
  });
});

describe("findPairs", () => {
  it("faqat threshold'dan yuqori juftliklarni qaytaradi", () => {
    const items = [
      { id: "a", text: longText },
      { id: "b", text: modifiedText },
      { id: "c", text: unrelatedText },
    ];
    const pairs = findPairs(items, 0.35);
    expect(pairs.length).toBe(1);
    expect(pairs[0]?.aId).toBe("a");
    expect(pairs[0]?.bId).toBe("b");
    expect(pairs[0]?.score).toBeGreaterThan(0.35);
  });

  it("score bo'yicha kamayish tartibida saralaydi", () => {
    const items = [
      { id: "a", text: longText },
      { id: "b", text: modifiedText },
      { id: "c", text: longText },
    ];
    const pairs = findPairs(items, 0.35);
    expect(pairs[0]?.score).toBeGreaterThanOrEqual(pairs[1]?.score ?? 0);
    const ids = pairs.map((pair) => [pair.aId, pair.bId].sort().join("-"));
    expect(ids).toContain("a-c");
    expect(ids).toContain("b-c");
  });
});

describe("maxScoreByItem", () => {
  it("har bir id uchun eng yuqori score ni qaytaradi", () => {
    const result = maxScoreByItem([
      { aId: "a", bId: "b", score: 0.5 },
      { aId: "a", bId: "c", score: 0.2 },
      { aId: "b", bId: "c", score: 0.7 },
    ]);
    expect(result).toEqual({ a: 0.5, b: 0.7, c: 0.7 });
  });

  it("bo'sh juftliklar ro'yxati uchun bo'sh obyekt qaytaradi", () => {
    expect(maxScoreByItem([])).toEqual({});
  });
});
