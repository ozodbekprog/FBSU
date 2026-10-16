# 4 TIZIM SPEC — Moodle'dan ko'chirish (Faza 0)

> Sana: 2026-10-16 · Holat: Faza 0 (spec) + Faza 1 (capability) boshlandi
> Manba tahlil: `docs/ROLLAR-RUXSATLAR-HISOBOT.md`, Moodle 6.0dev tahlili

## Umumiy tamoyil

Moodle'dan **g'oya** olinadi, kod emas. Har tizim minimal versiyada, mavjud
stack (Next.js + Prisma) ichida, mavjud modul tuzilishiga mos qilib yoziladi.
Har faza: modul → test → build → migratsiya → hisobot.

---

## 1. Capability (ruxsat tizimi) — FAZA 1 ✅ BOSHLANDI

**Muammo:** ruxsatlar 196+ route ichida `user.role === "..."` ko'rinishida
tarqalgan; API darajasida scope nazorati qisman (G6); registrator huquqlari
tor (G3). Har yangi sahifa — yangi xavf.

**Moodle g'oyasi:** rol → huquq (capability) → kontekst. Bizda soddalashtirilgan:
- 17 ta capability (764 emas), 2 scope: `global` va `course`
- 12 rol — mavjud Prisma `Role` enum bilan bir xil
- Override yo'q (Faza 2+ da kurs darajasida kerak bo'lsa qo'shiladi)

**Model:**
- `src/modules/capabilities/registry.ts` — capability ro'yxati + meta
- `src/modules/capabilities/presets.ts` — rol → capability presetlari, kurs munosabati matritsasi
- `src/modules/capabilities/has.ts` — `hasCapability(role, cap)`, `hasCourseCapability(relation, cap)`

**Migratsiya tartibi:**
1. `src/modules/roles/access.ts` — yangi reyestrga delegatsiya (API o'zgarmaydi)
2. Route'lardagi to'g'ridan-to'g'ri rol tekshiruvlari — capability'ga o'tkazish
3. API scope auditi (G6): har endpointda `requireCapability` yagona nuqta

**Test:** `capabilities.test.ts` — preset parity + yangi qoidalar.

**Migratsiya holati (2026-10-16):**
- ✅ `src/modules/roles/access.ts` — delegatsiya (API o'zgarmadi)
- ✅ `api/admin/users` + `[id]` → `academic.manage` (ADMIN, REGISTRAR parity)
- ✅ `api/grade-changes` + `[id]` → `gradeChanges.review`
- ✅ `api/tasks` + `[id]` → `tasks.manage`
- ✅ 2-to'lqim: `api/quizzes` x2 → `quiz.manage`; `api/finance/contracts` + `payments` → `finance.view` + `academic.manage`; `api/diplomas` → `diplomas.view` + `academic.manage`; `api/transcript` → `transcript.view`; `api/certificates` + `certificate-access` → `certificates.issue`
- ✅ 3-to'lqim: `layout.tsx` nav ruxsatlari → `parent.viewChild`, `documents.view`, `diplomas.view`, `finance.view`, `access.viewLogs`, `monitoring.view`, `approvals.decide`, `curator.manage` (24 capability)
- ✅ 4-to'lqim: `api/schedule` → `schedule.manage`; `api/exams/sessions` + `api/secure-exams/[id]` + `server/secure-exam.ts` → `exams.manage`; `api/admin/groups/[id]` + `api/admin/study-plans` + `api/documents/[id]` → `academic.manage` (26 capability)
- ✅ 5-to'lqim: `api/question-bank` → `quiz.manage`; `api/attendance/sessions` → `attendance.open`; `api/admin/import` → `academic.manage`; `course-access.ts` → `canManageCourse` delegatsiyasi (36 faylga ta'sir)
- ℹ️ Qolgan qaror nuqtalari: `workload` API leadership'ni kiritmaydi (nav ko'rsatadi — G2 ziddiyati), `enrollments` 3-rolli gate, `publications`, BUXGALTER `finance.view`
- ✅ Migratsiya (1–5 to'lqim), audit: 596 → 512 xom tekshiruv (qolganlar asosan UI varianti va ownership scope qoidalari)
- 🕓 Katta to'lqinlar: `layout.tsx` (36), `dashboard/page.tsx` (35), `schedule/*`, `exams/*`, `documents/*`, `workload`, `attendance`
- ⚠️ Qaror kerak: `BUXGALTER` hozir `finance.view`ga ega emas (eski kodda ham yo'q edi) — moliya bo'limi uchun ochish tavsiya etiladi
- Qo'shildi: `src/modules/capabilities/server.ts` — `requireApiCapability` / `requirePageCapability` (yangi endpointlar uchun yagona nuqta)

**Out of scope (hozircha):** role override admin UI, custom rollar, per-user grant.

---

## 2. Event + Audit (hodisalar) — FAZA 2

**Muammo:** `AuditLog` model bor, lekin tizim emas — nima yozilishi qo'lda
hal qilinadi; "kim, qachon, nima qildi" savoli izchil emas.

**Moodle g'oyasi:** 637 event klassi → markaziy log (`logstore_standard_log`),
logs hisoboti (filtr bilan), baho tarixi (`grade_grades_history`).

**Model (minimal):**
- `src/modules/events/` — event katalogi (capability kabi registry)
- `recordEvent(actorId, event, { target, course, meta, ip })` — yagona nuqta
- Prisma: mavjud `AuditLog` kengaytiriladi (eventType, targetType, targetId, meta Json)
- Muhim amallar majburiy: baho, o'chirish, ruxsat, login, eksport
- Admin sahifasi: filtrlab ko'rish (user, tur, sana, kurs)

**Holat (2026-10-16):**
- ✅ `src/modules/events/` — katalog: 61 event × 14 kategoriya, `isEventName`, `eventsByCategory`, `eventLabel`, `EVENT_CATEGORY_LABELS` + 7 test
- ✅ `recordEvent` — yagona nuqta (mavjud `logAudit`ga delegatsiya qiladi — string'lar barqaror)
- ✅ To'liq migratsiya: barcha `await logAudit` chaqiruvlari (25 fayl, 32 chaqiruv) `recordEvent`ga o'tdi — codemod: `scripts/events-migrate.mjs` (dry-run + katalog validatsiyasi bilan)
- ✅ Admin sahifada **kategoriya filtri** (uz label'lar, sonlar bilan, pagination'da saqlanadi)
- ℹ️ `AuditLog` model va `/admin/audit` sahifasi (filtr + pagination) allaqachon mavjud edi — qayta qurilmadi, ustiga **standart qatlam** qo'shildi
- 🕓 Keyingi: login/logout eventlarini auth oqimiga ulash (hozir qisman), `createAuditLog` (lib) chaqiruvlarini ham bosqichma-bosqich o'tkazish

**Out of scope:** real-time stream, tashqi logstore, observability.

---

## 3. Admin panel — FAZA 3 ✅ YAKUNLANDI

**Muammo:** admin sahifalari bor (17 ta), lekin bulk amallar va saqlash
yo'q; foydalanuvchi boshqaruvi bittalab.

**Moodle g'oyasi:** bulk user actions, filtrlar, cohort, configni boshqarish.

**Model (minimal):**
- Users: bulk tanlash → rol berish / guruhga qo'shish / o'chirish / parol reset
- Groups/courses: bulk enrollment
- Filtrlar: rol, guruh, fakultet, holat
- Har bulk amal `recordEvent` bilan yoziladi (Faza 2 ga tayanadi)

**Holat (2026-10-16):**
- ✅ `POST /api/admin/users/bulk` — activate/deactivate: capability (`academic.manage`), CSRF, REGISTRAR scope (faqat STUDENT/TEACHER), oxirgi-admin himoyasi (409), audit (`admin.user.update`)
- ✅ `UserBulkBar` — checkbox panel + ikki amal tugmasi, `apiFetch` (CSRF avtomatik), natija/xato xabarlari
- 🕓 Keyingi: guruhga ommaviy qo'shish, filtrlar (rol/guruh/fakultet), bulk enrollment

**Out of scope (hozircha):** plugin sozlamalari, konfiguratsiya eksporti.

---

## 4. Gradebook (soddalashtirilgan) — FAZA 4 ✅ YAKUNLANDI (MVP)

**Muammo:** baho `Grade` model + `GradeChangeRequest` bor, lekin yagona
jurnal hisoblash yo'q (kategoriya, vazn, yakuniy baho).

**Moodle g'oyasi:** grade_item (kategoriya + vazn), final grade hisoblash,
grade history, scales. Formulas/outcomes — olinmaydi.

**Model (minimal):**
- `GradeCategory` (kurs ichida) + `GradeItem` (vazn bilan)
- Yakuniy baho: kategoriyalar bo'yicha vaznli o'rtacha, 60/40 kabi presetlar
- Barcha o'zgarishlar — tarixga (Faza 2 eventlari orqali)
- Jurnal sahifasi: admin/o'qituvchi tablosi + yakuniy hisoblash ko'rinishi

**Holat (2026-10-16):**
- ✅ Schema: `GradeCategory` / `GradeItem` / `GradeItemScore` + migratsiya (xavfsiz qo'lda apply — db reset qilinmadi)
- ✅ `src/modules/gradebook/compute.ts` — sof hisoblash (8 test); `auto-sync.ts` — topshiriq/test manbalaridan (6 test)
- ✅ API: GET jurnal; POST categories/items (manba: MANUAL/ASSIGNMENT/QUIZ + refId bog'lash); PUT scores; DELETE categories/items; POST sync
- ✅ `/gradebook` sahifasi + `GradebookManager` (kategoriya/ustun CRUD, inline ballar, «Sinxronlash» tugmasi)
- ✅ Nav link + ikonkalar; barcha amallar `recordEvent` bilan (6 yangi event)
- 🕓 Keyingi: talabaga o'z bahosi ko'rinishi; i18n kalitlari; 60/40 presetlar

**Out of scope:** outcomes, scales, formulalar, ishlash usuli (aggregation) tanlovlari.

---

## Faza tartibi va bog'liqlik

```
Faza 1 Capability ──→ Faza 2 Event+Audit ──→ Faza 3 Admin bulk
                          └──────────────────→ Faza 4 Gradebook
```

Faza 2 dan keyin 3 va 4 parallel bo'lishi mumkin (orkestr ishchilari bilan).
