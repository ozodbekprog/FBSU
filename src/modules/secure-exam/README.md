# Secure Exam moduli

Kod bilan kiriladigan, nazorat ostidagi test sessiyalari. O'qituvchi test ustidan
"xavfsiz imtihon" sessiyasini yaratadi, talaba kod bilan kiradi va qulflangan
rejimda topshiradi. Qoidabuzarliklar qayd etiladi, o'qituvchi jonli kuzatadi.

## Oqim

1. **O'qituvchi** `/secure-exams` da sessiya yaratadi: test, vaqt oynasi, davomiylik,
   qoidalar (fullscreen, nusxa blok, kamera, ogohlantirish limiti). Tizim 6 belgili
   kod generatsiya qiladi (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, chalkash belgilarsiz).
2. **Talaba** `/secure-exams` da kodni kiritadi → `POST /api/secure-exams/join` →
   quiz attempt + run yaratiladi (yoki mavjudi qayta ochiladi) → `/exam/[runId]`.
3. **Imtihon xonasi** (`/exam/[runId]`, `(exam)` route group — sidebarsiz):
   - darvoza (qoidalar) → fullscreen + (ixtiyoriy) kamera → savollar;
   - savollar tartibi va variantlar har bir urinish uchun deterministik aralashtiriladi
     (`attemptId` seed bilan); javoblar saqlashda original indekslarga qaytariladi;
   - har 10 s da `POST /api/secure-exams/runs/[id]/sync`: hodisalar + javoblar autosave +
     klient holati (monitorlar soni, fullscreen, kamera);
   - vaqt tugasa yoki ogohlantirish limiti yetsa — server tomonda yakunlanadi.
4. **O'qituvchi monitori** `/secure-exams/[id]`: ishtirokchilar jadvali (online,
   ogohlantirishlar, monitorlar, ball), jonli hodisalar lentasi, amallar: to'xtatish,
   +5 daqiqa, sessiyani yakunlash (barcha faol urinishlarni topshiradi), o'chirish.

## Model va modul

DB: `SecureExam`, `SecureExamRun`, `SecureExamEvent` (enumlar: `SecureExamStatus`,
`SecureExamRunStatus`, `SecureExamLimitAction`).

Modul: `src/modules/secure-exam/`
- `code.ts` — kod generatsiya/normalizatsiya/formatlash;
- `events.ts` — hodisa turlari va og'irliklari (INFO/WARNING/CRITICAL);
- `policy.ts` — deadline (oyna ∩ davomiylik + qo'shimcha daqiqa), limit, online;
- `order.ts` — aralashtirish va javoblarni original/ko'rsatiladigan indekslar orasida qaytarish;
- `schemas.ts` — zod sxemalar (API uchun).

Hodisalar og'irligi: WARNING = 1 ogohlantirish; CRITICAL (masalan, ikkinchi monitor) =
butun limitni to'ldiradi; INFO faqat yozib boriladi. Limitdan keyingi amal:
`TERMINATE` (avtomatik topshirish) yoki `WARN` (faqat qayd).

## API

- `POST /api/secure-exams` — sessiya yaratish (TEACHER/ADMIN).
- `POST /api/secure-exams/join` — kod bilan kirish (STUDENT, rate-limit 12/daq).
- `GET /api/secure-exams/[id]` — monitor ma'lumoti (5 s poll).
- `PATCH /api/secure-exams/[id]` — `ACTIVE` / `CLOSED` (yopishda faol urinishlar topshiriladi).
- `DELETE /api/secure-exams/[id]` — ishtirokchisiz sessiyani o'chirish.
- `POST /api/secure-exams/runs/[id]/sync` — talaba: hodisalar + javoblar + heartbeat.
- `POST /api/secure-exams/runs/[id]/terminate` — o'qituvchi to'xtatadi (joriy javoblar baholanadi).
- `POST /api/secure-exams/runs/[id]/extra` — +daqiqa.

Barcha javoblar `{ ok, data }` / `{ ok, error }` formatida, CSRF proxy darajasida tekshiriladi.

## Web va Windows klient (2-bosqich)

Hozirgi web rejim — eng yaxshi samarali nazorat: fullscreen talabi, tab/oyna
almashishni qayd etish, nusxa/kontekst menyuni bloklash, multi-monitor aniqlash,
kamera. Webdan chetlab o'tish odatda seziladi, lekin to'liq to'sib bo'lmaydi.

`requireClient` bayrog'i va `client` payload maydonlari (`clientId`, `version`,
`platform`, `screens`, `fullscreen`, `webcam`) Electron klient uchun shartnoma:
- klient `version` ni `app-x.y` ko'rinishida yuboradi, `platform` = `win32`;
- klient qo'shimcha hodisalarni (jarayon bloklandi, Alt+Tab, klient yopilishi) yuboradi;
- server tomonda `requireClient` tekshiruvi yoqilganda faqat imzolangan klient
  sessiyalari qabul qilinadi (2-bosqichda ulanadi).

## Testlar

`src/modules/secure-exam/*.test.ts` — kod, hodisalar, siyosat, aralashtirish (vitest).
`e2e/secure-exam.spec.ts` — o'qituvchi yaratadi → talaba kiradi → savol belgilanadi →
kontekst menyu hodisasi → topshirish → monitor natijani ko'rsatadi (Playwright).
