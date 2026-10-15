# Secure Exam moduli

Kod bilan kiriladigan, nazorat ostidagi test sessiyalari. O'qituvchi test ustidan
"xavfsiz imtihon" sessiyasini yaratadi, talaba kod bilan kiradi va qulflangan
rejimda topshiradi. Qoidabuzarliklar qayd etiladi, o'qituvchi jonli kuzatadi.

## Oqim

1. **O'qituvchi** `/secure-exams` da sessiya yaratadi. Tezkor rejim: testni tanlab
   davomiylikni bosish kifoya (30/45/60 daqiqa) — imtihon darhol boshlanadi (2 soatlik
   oyna, fullscreen + nusxa blok, 3 ogohlantirishdan keyin to'xtash). To'liq sozlamalar
   "Qo'shimcha sozlamalar" ostida (vaqt oynasi, limit harakati, kamera, FBSU ilovasi).
   Tizim 6 belgili kod (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) va **to'g'ridan-to'g'ri
   havola** beradi: `/e/{code}` + QR kod (monitor sahifasida). Har bir imtihonni
   ro'yxatdan "Qayta yaratish" bilan bir klikda takrorlash mumkin.
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

## Exam domeni (faqat imtihon)

`fbsu-exam.vercel.app` (yoki `EXAM_HOSTS` env) — alohida imtihon tajribasi:
- `/` → `/e` (exam bosh sahifasi: kod kiritish + urinishlar ro'yxati, LMS menyusiz);
- faqat `/e`, `/exam`, `/secure-exams` (o'qituvchi paneli), `/login` va API yo'llari
  ochiladi; qolgan har qanday LMS yo'li `/` ga qaytariladi;
- `(exam)` route group minimal tartib beradi: logo + foydalanuvchi + "Xavfsiz rejim" chip.

Yozilganlik (enrollment) tekshiriladi; davomat to'sig'i yo'q — sessiyani o'qituvchi
jonli nazorat qiladi, kodni faqat kerakli talabalarga beradi.

## Model va modul

DB: `SecureExam`, `SecureExamRun`, `SecureExamEvent` (enumlar: `SecureExamStatus`,
`SecureExamRunStatus`, `SecureExamLimitAction`).

Modul: `src/modules/secure-exam/`
- `code.ts` — kod generatsiya/normalizatsiya/formatlash;
- `events.ts` — hodisa turlari va og'irliklari (INFO/WARNING/CRITICAL);
- `policy.ts` — deadline (oyna ∩ davomiylik + qo'shimcha daqiqa), limit, online;
- `order.ts` — aralashtirish va javoblarni original/ko'rsatiladigan indekslar orasida qaytarish;
- `schemas.ts` — zod sxemalar (API uchun);
- `input-anomaly.ts` — klaviatura/sichqoncha anomaliyalari (robot kiritish, avtoklik, sakrash)
  sof tracker'lar;
- `face-guard.ts` — yuz kuzatuvi qarorlari (yuz yo'q, bir nechta yuz, yonga qarash, jonli
  harakat) sof tracker.

Hodisalar og'irligi: WARNING = 1 ogohlantirish; CRITICAL (masalan, ikkinchi monitor) =
butun limitni to'ldiradi; INFO faqat yozib boriladi. Yangi turlar: FACE_OK (INFO);
FACE_ABSENT / LOOK_AWAY / FACE_MISMATCH / FACE_LIVENESS / KEY_ANOMALY / MOUSE_ANOMALY
(WARNING); FACE_MULTIPLE / AUTOMATION_DETECTED (CRITICAL). Limitdan keyingi amal:
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
`e2e/secure-exam.spec.ts` — o'qituvchi tezkor rejimda yaratadi → talaba kiradi → savol
belgilanadi → kontekst menyu hodisasi → topshirish → monitor natijani ko'rsatadi (Playwright).

## Yuz va kiritma nazorati (nazorat qatlami)

Kamera yoqilgan va talabada Face ID (User.faceDescriptor) mavjud bo'lsa, imtihon
qo'shimcha nazorat bilan o'tadi. DB o'zgarmaydi — barchasi mavjud hodisalar
quvuri orqali yozib boriladi.

Darvoza (gate):
- boshlashdan oldin `FaceScan` jonli tekshiruvi (blink/smile/burilish) o'tkaziladi;
- olingan deskriptor birinchi `sync` bilan serverga yuboriladi;
- `checkFace` mos kelmasa (`mismatch`) imtihon boshlanmaydi, xato ko'rsatiladi;
- Face ID bo'lmasa imtihon davom etadi, lekin yuz nazoratisiz.

Imtihon davomida:
- har ~1.2s da `useFaceGuard`: yuz yo'q (5s+) → FACE_ABSENT; 2+ shaxs → FACE_MULTIPLE;
  yonga qarash (yaw Δ>0.24, 1.4s+, 10s cooldown) → LOOK_AWAY; 60s ichida blink bo'lmasa →
  FACE_LIVENESS;
- har ~30s da deskriptor serverga yuboriladi: mos kelsa bir marta FACE_OK (INFO),
  kelmasa FACE_MISMATCH (WARNING, 30s cooldown) — ogohlantirish limitiga hisoblanadi;
- `useInputGuard`: robot yozish (tez/uniform intervallar) → KEY_ANOMALY; avtoklik/sakrash →
  MOUSE_ANOMALY; soxta hodisalar (isTrusted=false) yoki navigator.webdriver →
  AUTOMATION_DETECTED (CRITICAL);
- holat kamera preview yonida chip sifatida ko'rinadi; o'qituvchi monitorda barcha
  hodisalarni jonli ko'radi;
- kamera paneli imtihon ekranining yuqori qismida (o'ng burchakda) turadi;
- WARNING va CRITICAL hodisalar o'qituvchiga Notification (qo'ng'iroq) orqali boradi,
  ixtiyoriy Telegram/email kanallari ham ishlaydi (`notifyUser`).

Sozlamalar `config.ts` da: FACE_ABSENT_AFTER_MS, LOOK_AWAY_AFTER_MS, LOOK_AWAY_YAW_DELTA,
FACE_MISMATCH_COOLDOWN_MS, ANOMALY_COOLDOWN_MS va h.k. Testlar:
`face-guard.test.ts`, `input-anomaly.test.ts`.
