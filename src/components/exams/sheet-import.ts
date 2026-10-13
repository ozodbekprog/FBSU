/**
 * Imtihon sessiyasi uchun talabalar ro'yxatini import qilish mantig'i.
 *
 * Ikki bosqich:
 *   1. Matndan ismlarni ajratish (`parseNameList`) — qatorlar, vergul,
 *      raqamlash, ortiqcha bo'shliqlar.
 *   2. Ajratilgan ismlarni kursga yozilgan talabalarga bog'lash
 *      (`matchStudents`) — ism-familiya tartibi har xil bo'lishi mumkin.
 *
 * AI import ham xuddi shu funksiyalardan foydalanadi: farq faqat
 * 1-bosqichda — matn LLM orqali tozalanadi (chatdan ko'chirilgan
 * tartibsiz matn, ortiqcha so'zlar va h.k.).
 */

export type EnrolledStudent = { id: string; name: string };

export type ImportedRow = { input: string; seat?: string };

export type MatchedRow = {
  studentId: string;
  /** Tizimdagi ism (talaba profili) */
  name: string;
  /** Import faylida yozilgan ism (mos kelgan variant) */
  input: string;
  seat?: string;
};

export type MatchResult = {
  matched: MatchedRow[];
  /** Import ro'yxatida bor, lekin kursda topilmagan */
  unmatched: string[];
  /** Bir nechta talabaga mos keldi — qo'lda tanlash kerak */
  ambiguous: { input: string; candidates: { id: string; name: string }[] }[];
};

/**
 * Ismni solishtirish uchun normallashtiradi.
 *
 * - o'zbekcha apostrof variantlari (ʻ U+02BB, ' U+2019, ' U+0027, ` ) bir xil
 * - registr va ortiqcha bo'shliqlar tashlanadi
 * - tinish belgilari olib tashlanadi (nuqta, vergul, qavs)
 */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    // O'zbek apostrofining barcha amaldagi variantlari bir xil ko'rinishga:
    //   U+02BB ʻ, U+02BC ʼ, U+2018 ', U+2019 ', U+0060 `, U+00B4 ´, U+0027 '
    // Real ma'lumotlarda har xil bo'ladi (Word, Google Docs, chat) —
    // normallashtirilmasa bir xil ism ikki xil chiqadi.
    .replace(/[\u02BB\u02BC\u2018\u2019\u0060\u00B4\u0027]/g, "'")
    .replace(/[.,()\[\]{}–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** So'zlarni tartibdan qat'i nazar solishtirish uchun kalit. */
function tokenKey(value: string): string {
  return normalizeName(value).split(" ").filter(Boolean).sort().join(" ");
}

/**
 * Matndan ism ro'yxatini ajratadi.
 *
 * Quyidagi ko'rinishlarni tushunadi:
 *   "1. Aziz Karimov"        → raqam olib tashlanadi
 *   "2) Karimov Aziz"        → raqam olib tashlanadi
 *   "Aziz Karimov, A-12"     → joy raqami verguldan keyin olinadi
 *   "Aziz Karimov\tA-12"     → TAB ham ajratuvchi
 *   bo'sh qatorlar           → tashlanadi
 */
export function parseNameList(text: string): ImportedRow[] {
  const rows: ImportedRow[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    // Har bir qatorda bir nechta ism bo'lishi mumkin: "Aziz, Karim, Dilnoza"
    // faqat vergul bilan yozilgan bo'lsa — bu noaniq, shuning uchun qatorni
    // bo'laklarga ajratmaymiz. Faqat TAB bilan ajratilgan joy raqamini olamiz.
    const line = rawLine.trim();
    if (!line) continue;

    // Boshidagi raqamlash: "1." / "1)" / "1 -" / "- "
    const withoutIndex = line.replace(/^\s*(?:\d+\s*[.)\]:-]|[-•*])\s*/, "").trim();
    if (!withoutIndex) continue;

    // TAB yoki " | " bilan ajratilgan joy raqami
    const parts = withoutIndex.split(/\t+|\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
    const input = parts[0].replace(/[,;]+$/, "").trim();
    const seat = parts[1]?.replace(/[,;]+$/, "").trim() || undefined;
    if (!input) continue;

    rows.push({ input, seat });
  }

  return rows;
}

/**
 * Ajratilgan ismlarni kursga yozilgan talabalarga bog'laydi.
 *
 * Mos kelish tartibi:
 *   1. To'liq normallashtirilgan ism tengligi
 *   2. So'zlar to'plami tengligi (ism-familiya tartibi teskari bo'lsa)
 *   3. Bitta so'z kiritilgan bo'lsa (masalan faqat familiya) va u faqat
 *      bitta talabaga mos kelsa — o'shanga bog'lanadi
 *
 * Bir nechta talabaga mos kelsa — `ambiguous` ga tushadi (qo'lda tanlash).
 * Hech biriga mos kelmasa — `unmatched`.
 */
export function matchStudents(imported: ImportedRow[], enrolled: EnrolledStudent[]): MatchResult {
  const byExact = new Map<string, EnrolledStudent[]>();
  const byTokens = new Map<string, EnrolledStudent[]>();
  // Har bir SO'Z bo'yicha indeks: foydalanuvchi faqat familiyani yozishi
  // mumkin ("Tursunov"), familiya esa ismning oxirida turadi. Faqat
  // birinchi so'z bo'yicha izlash bunday holatni o'tkazib yuborardi.
  const byWord = new Map<string, EnrolledStudent[]>();

  function push(map: Map<string, EnrolledStudent[]>, key: string, student: EnrolledStudent) {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(student);
    else map.set(key, [student]);
  }

  for (const student of enrolled) {
    const exact = normalizeName(student.name);
    push(byExact, exact, student);
    push(byTokens, tokenKey(student.name), student);
    for (const word of exact.split(" ")) push(byWord, word, student);
  }

  const matched: MatchedRow[] = [];
  const unmatched: string[] = [];
  const ambiguous: MatchResult["ambiguous"] = [];
  const used = new Set<string>();

  for (const row of imported) {
    const exact = normalizeName(row.input);
    if (!exact) continue;

    let candidates = byExact.get(exact) ?? [];
    if (candidates.length === 0) candidates = byTokens.get(tokenKey(row.input)) ?? [];

    // Faqat bitta so'z kiritilgan bo'lsa (ism yoki familiya) — shu so'z
    // bo'yicha izlaymiz. Bir nechta talabaga mos kelsa, pastda
    // "noaniq" ro'yxatiga tushadi va foydalanuvchi o'zi tanlaydi.
    if (candidates.length === 0 && exact.split(" ").length === 1) {
      candidates = byWord.get(exact) ?? [];
    }

    // Allaqachon qo'shilganlarni chiqarib tashlaymiz (takroriy qatorlar uchun)
    const fresh = candidates.filter((c) => !used.has(c.id));

    if (fresh.length === 1) {
      used.add(fresh[0].id);
      matched.push({ studentId: fresh[0].id, name: fresh[0].name, input: row.input, seat: row.seat });
    } else if (fresh.length > 1) {
      ambiguous.push({ input: row.input, candidates: fresh.map((c) => ({ id: c.id, name: c.name })) });
    } else {
      unmatched.push(row.input);
    }
  }

  return { matched, unmatched, ambiguous };
}
