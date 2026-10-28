import type { Dictionary } from "./uz";

const SPLIT =
  /(\{[^}]*\}|<[^>]+>|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|\b[A-Z]{2,}\b|\b[A-Za-z]+\d+[A-Za-z0-9]*\b)/g;

const PROTECTED =
  /^(\{[^}]*\}|<[^>]+>|https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|\b[A-Z]{2,}\b|\b[A-Za-z]+\d+[A-Za-z0-9]*\b)$/;

function mapOutsideProtected(text: string, transform: (chunk: string) => string): string {
  if (!text) return text;
  return text
    .split(SPLIT)
    .map((part) => (part && PROTECTED.test(part) ? part : transform(part)))
    .join("");
}

const NEW_PAIRS: Array<[RegExp, string]> = [
  [/o['’‘ʻ´]/g, "ö"],
  [/O['’‘ʻ´]/g, "Ö"],
  [/g['’‘ʻ´]/g, "ğ"],
  [/G['’‘ʻ´]/g, "Ğ"],
  [/SH/g, "Ş"],
  [/Sh/g, "Ş"],
  [/sh/g, "ş"],
  [/CH/g, "Ç"],
  [/Ch/g, "Ç"],
  [/ch/g, "ç"],
];

function newChunk(chunk: string): string {
  let output = chunk;
  for (const [pattern, replacement] of NEW_PAIRS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

export function toNewAlphabet(text: string): string {
  return mapOutsideProtected(text, newChunk);
}

const CYR_PAIRS: Array<[RegExp, string]> = [
  [/o['’‘ʻ´]/g, "ў"],
  [/O['’‘ʻ´]/g, "Ў"],
  [/g['’‘ʻ´]/g, "ғ"],
  [/G['’‘ʻ´]/g, "Ғ"],
  [/SH/g, "Ш"],
  [/Sh/g, "Ш"],
  [/sh/g, "ш"],
  [/CH/g, "Ч"],
  [/Ch/g, "Ч"],
  [/ch/g, "ч"],
  [/YO/g, "Ё"],
  [/Yo/g, "Ё"],
  [/yo/g, "ё"],
  [/YU/g, "Ю"],
  [/Yu/g, "Ю"],
  [/yu/g, "ю"],
  [/YA/g, "Я"],
  [/Ya/g, "Я"],
  [/ya/g, "я"],
  [/TS/g, "Ц"],
  [/Ts/g, "Ц"],
  [/ts/g, "ц"],
  [/NG/g, "НГ"],
  [/Ng/g, "Нг"],
  [/ng/g, "нг"],
];

const CYR_LETTERS: Record<string, string> = {
  a: "а", b: "б", d: "д", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р",
  s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з", c: "к",
  A: "А", B: "Б", D: "Д", F: "Ф", G: "Г", H: "Ҳ", I: "И", J: "Ж",
  K: "К", L: "Л", M: "М", N: "Н", O: "О", P: "П", Q: "Қ", R: "Р",
  S: "С", T: "Т", U: "У", V: "В", W: "В", X: "Х", Y: "Й", Z: "З", C: "К",
  "'": "ъ", "’": "ъ", "‘": "ъ", "ʻ": "ъ", "´": "ъ",
};

const CYR_VOWELS = new Set(["а", "е", "ё", "и", "о", "у", "ў", "э", "ю", "я", "й"]);
const LETTER = /[A-Za-zА-Яа-яЁёЎўҒғҚқҲҳ]/;

function cyrChunk(chunk: string): string {
  let output = "";
  for (const letter of chunk) {
    if (letter === "e" || letter === "E") {
      const previous = output.slice(-1);
      const wordStart = previous === "" || !LETTER.test(previous);
      const isVowel = CYR_VOWELS.has(previous.toLowerCase());
      output += wordStart || isVowel
        ? letter === "E" ? "Э" : "э"
        : letter === "E" ? "Е" : "е";
      continue;
    }
    output += CYR_LETTERS[letter] ?? letter;
  }
  return output;
}

function cyrTransform(chunk: string): string {
  let output = chunk;
  for (const [pattern, replacement] of CYR_PAIRS) {
    output = output.replace(pattern, replacement);
  }
  return cyrChunk(output);
}

export function toCyrillic(text: string): string {
  return mapOutsideProtected(text, cyrTransform);
}

export function transformDictionary(
  source: Dictionary,
  transform: (text: string) => string,
): Dictionary {
  const result: Record<string, string> = {};
  for (const key of Object.keys(source) as Array<keyof Dictionary>) {
    result[key as string] = transform(source[key]);
  }
  return result as Dictionary;
}
