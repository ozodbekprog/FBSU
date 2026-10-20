# STATUS — qurilish holati

Oxirgi yangilanish: PII shifrlash fallback + EduPage soatlik avtosinxron (2026-10-21)

## PII shifrlash fallback (2026-10-21)

- [x] `DATA_ENCRYPTION_KEY` bo'lmasa Prisma kengaytmasi shifrlashni o'tkazib yuboradi
      (avval har qanday PII yozuvi/`where.email` 500 berardi — login ham)
- [x] Bir marta logga ogohlantirish; kalit qo'yilganda avtomatik yoqiladi
- [x] Test: `isEncryptionConfigured()` kalit bor/yo'q holatda
- [ ] Keyingi: kalit + backup + `npm run db:encrypt` bilan shifrlashni yoqish
      (`docs/production-deploy.md`)

## EduPage soatlik avtosinxron (2026-10-21)

- [x] `.github/workflows/edupage-sync.yml` — har soatda `GET /api/edupage/sync`
      (Bearer secret), qo'lda `workflow_dispatch` ham bor
- [x] `edupage:sync-lock` — DB darajasidagi qulf; cron, sahifa va qo'lda sinxron
      bir vaqtda ketsa ikkinchisi 409 bilan qaytadi (10 daqiqa TTL)
- [x] `autoSyncEduPageSchedule` band qulfni xato deb hisoblamaydi
- [x] Sozlash: `EDUPAGE_SYNC_SECRET` (yoki `CRON_SECRET`) Vercel + GitHub secret;
      ixtiyoriy `APP_URL` repo variable
- [x] Hujjat: `docs/production-deploy.md`; admin kartada yangilanish tavsifi uz/ru/en

## EduPage avto jadval (2026-10-15)

- [x] Manba: `https://ttpu.edupage.org/timetable/` — ommaviy aSc EduPage RPC
      (`getTTViewerData` → `regularttGetData`); login talab qilmaydi
- [x] `src/lib/edupage.ts` — yuklab olish + normallashtirish (sinflar, fanlar,
      o'qituvchilar, xonalar, kun/par, hafta juftligi); 15 daqiqalik kesh
      (`unstable_cache`, tag `edupage-timetable`) + 3 marta qayta urinish
- [x] Integratsiya **o'z sahifalarimizda**: `/schedule` (dars jadvali, rol bo'yicha),
      `/admin/users` (o'qituvchilar), `/admin/groups` (guruhlar),
      `/admin/dictionaries` (fanlar + o'qituvchilar), `/rooms` (xonalar).
      Alohida "Avto jadval" sahifasi olib tashlandi — kerak emas edi
- [x] Sinxron boshqaruvi `/admin/import` dagi "EduPage sinxronizatsiyasi" kartasida
      (oxirgi sinxron, statistika, "Hozir yangilash"); `Jadval` sahifasi ochilganda
      30 daqiqadan eski bo'lsa fonda avtomatik yangilanadi
- [x] `GET /api/edupage/timetable?class=AI2-26` — normallashtirilgan JSON (auth kerak)
- [x] **O'qituvchilar/ fanlar / xonalar ham ko'chiriladi**: 201 yangi o'qituvchi
      (`TEACHER`, `a.mamanazarov@ttpu.uz` ko'rinishidagi email, tasodifiy parol —
      parolni faqat admin yangilaydi), 292 fan (rang bilan), 70 xona;
      jadval yozuvlari `teacherId`/`subjectId` ga bog'lanadi, 234 ta fan-o'qituvchi
      juftligi (`TeacherSubject`) yaratildi
- [x] Sinf↔guruh: mos kelmagan sinflar uchun guruh **avtomatik yaratiladi**
      (nom + `edupageName` + yil), 96 ta yangi guruh — 1 475 dars import qilindi
- [x] Sinxron paytida EduPage'ga bog'langan guruhlardagi **eski qo'lda/seed
      yozuvlar avtomatik tozalanadi** (`source = null`), jadval manbaga mos qoladi
- [x] Bazaga sinxronlash: `Group.edupageName` bilan sinf↔guruh bog'lanishi,
      o'qituvchi ismlari bo'yicha moslashtirish (F.I.Sh. ↔ "A. Mamanazarov"),
      `ScheduleEntry.source="edupage"` + `externalId` (karta:kun:guruh) — takror
      import qilinmaydi, o'zgarganlari yangilanadi, manbadan o'chganlari o'chiriladi
- [x] `POST /api/edupage/sync` (ADMIN/REGISTRAR + CSRF; `Bearer CRON_SECRET` bilan cron)
      va sahifa ochilganda fon rejimida avto-sinxron (oxirgi sinxron 30 daqiqadan eski bo'lsa)
- [x] Admin uchun bir bosishda bog'lash: `/schedule/edupage` sahifasida "Bu sinfni
      guruhga bog'lash" (PATCH `/api/admin/groups/[id]` → `edupageName`)
- [x] Tekshiruv: 10/10 yangi unit test (jami 386), `tsc` 0 xato, `next build` yashil,
      jonli sinov: AI2-26 ← AI2-26 (17 dars), 4 o'qituvchi profilga bog'landi

## OpenBoard 2.0 — onlayn doska va daftar

- [x] `/board` qayta qurildi: Apple Notes uslubidagi sidebar (qidiruv, yaratish —
      bo'sh/doska/lab, o'chirish, nusxalash, sana) + blokli muharrir + avtosave
- [x] Bloklar: matn (rich-text), sarlavha, kod (JS/Math **Run**), formula (KaTeX),
      kimyoviy formula (mhchem), chizma (Excalidraw + PNG preview), rasm, jadval,
      cheklist, laboratoriya shabloni (→ `/labs`)
- [x] Saqlash: `Board.data` JSON v3 + `GET/PUT /api/openboard` (CSRF, zod, 9MB);
      eski v2 excalidraw yozuvi avtomatik v3 ga ko'chadi; topshiriq doskasi saqlanadi
- [x] Sidebar menyusida "Onlayn daftar" + topshiriq sahifasidagi tugma qaytarildi
- [x] Tekshiruv: 27/27 unit test; jonli Playwright E2E yashil; OpenBoard kodida tsc 0 xato
- [x] Prod: fbsu.vercel.app/board jonli (2026-10-13, merge 31c93c7)

## To'lqin 8 — "LEGO" qurish tizimi

- [x] **Jadval konstruktori** `/schedule/builder` — drag & drop: fan/xona bloklarini
      katakka sudrab tashlash (yoki mobil: bosib tanlab, katakka bosish); konflikt 409 →
      toast "Bu vaqt band"; ko'chirish/tahrir/o'chirish; LEGO uslub, snap animatsiyalar;
      o'qituvchi o'z fanlarini o'zi qo'shadi (o'z fanlari palette'si)
- [x] **Jurnal 2.0** — rasmdagidek mobil uslub: dumaloq rangli badge'lar (K/Kech/S/Y),
      avatarlar, oy navigatsiyasi, bugun ustuni; **Reyting** (top 10, medal)
- [x] **Modul sozlamalari** `/admin/settings` — 6 modulni (chat, sertifikat, kalendar,
      katalog, forum, QR davomat) o'yindek yoqish/o'chirish; nav avtomatik moslashadi
- [x] Baza: `AppSetting` modeli

## Jadval 2.0 (to'lqin 7)

- [x] **Hafta navigatsiyasi** — ← Bugun →, hafta sanalari, juft/toq hafta (#raqam) avtomatik
- [x] **Hozir / Keyingi dars** banner — jonli countdown bilan
- [x] **Jadval / Ro'yxat** ko'rinishlari (mobil uchun agenda)
- [x] **Guruh / O'qituvchi / Xona** rejimlari (staff uchun qidiruv)
- [x] **Dars holatlari** — O'zgargan / Ko'chirilgan / Bekor qilindi + izoh;
      bekor qilinganda guruhga **avtomatik xabarnoma**; tiklanganda ham
- [x] **Eksport** — `.ics` (Google/Apple Calendar import, paritet va bekor bilan),
      **Chop etish** sahifasi (A4, logo bilan)
- [x] **Bot** — yangi `/hafta` buyrug'i (kun-kun, bugun belgisi, holatlar)

## Davomat oqimi + 80% qoidasi (to'lqin 5)

- [x] **Dars-davomat oqimi** — o'qituvchi dashboard'da "Bugungi darslarim" (jadval bo'yicha):
      har darsda davomat holati (X/Y) + "Davomat belgilash" → talabalar ro'yxati K/Y/Kech/S,
      "Hammasi keldi", saqlash; jadvaldan ham bir bosishda
- [x] **80% qoidasi** — `/api/attendance/summary`, grades va kurs sahifasida
      "Imtihonga ruxsat" / "Ruxsat yo'q" badge; CSV eksportda yangi ustunlar
- [x] **Bot** — yangi `/davomat` buyrug'i o'qituvchi uchun (havolalar bilan);
      08:00 eslatmada o'qituvchiga darslari + davomat eslatmasi

## Yangi (to'lqin 4)

- [x] **Facebook-uslub profil** — cover rasm, katta avatar (yuklash bilan), bio (300 belgi),
      statistika (kurslar/sertifikatlar/o'rtacha), boshqa foydalanuvchi profili `/users/[id]`
- [x] **Chat tizimi** — DM (student↔teacher↔admin): suhbatlar ro'yxati, o'qilmagan badge
      (sidebar), 5s polling, foydalanuvchi qidiruvi, `?user=` bilan to'g'ridan-to'g'ri ochish,
      1 soniya flood himoyasi
- [x] **Admin chartlar** — sof SVG (Donut/Bar/Line): rollar, topshiriqlar 14 kun,
      davomat foizi, top kurslar; `/admin` "Tahlillar" bo'limi
- [x] **Telegram bot jonli** — @ttpu_uz_bot ishga tushdi (`node bot/telegram.mjs`),
      `/jadval`, `/ertaga`, kunlik eslatma 08:00, data.json (gitignored)

## UI jilo (brend dizayn tizimi)

- [x] Brend tokenlar: `brand-*` (navy #1d3460), `gold-*` aksent, surface fon, yumshoq soyalar
- [x] Logo (TTPU emblem SVG) + favicon + sidebar/topbar yangilandi
- [x] `ui.tsx` v2: nafis Card/Button/Badge/Stat/Input + Progress/Skeleton
- [x] Sidebar: faol holat pill (navy), gold nuqta indikatori, foydalanuvchi kartasi
- [x] Sahifalar qayta dizayn: landing, auth (demo hisob chips), dashboard, kurslar,
      topshiriqlar, e'lon/forum, testlar (fokus rejimi), jadval, baholar, hisobot,
      kalendar, sertifikat (print saqlangan), davomat/check-in, admin, katalog,
      bildirishnoma, profil
- [x] 5 parallel UI agent, tsc 0 xato, 14 sahifa 200

## To'lqin 3 da qo'shildi

- [x] **Talaba fayl topshirish** — upload API (10MB, magic bytes) + forma + o'qituvchi yuklab olish
- [x] **Katalog + enrollment** — published kurslar katalogi, o'zi yozilish, staff boshqaruvi
- [x] **E'lonlar + forum** — kurs e'lonlari (bildirishnoma bilan), forum mavzular/javoblar, pin
- [x] **Hisobot + eksport** — /reports sahifasi, statistika, 3 xil CSV eksport (BOM bilan)
- [x] **Kalendar + eslatma** — oylik deadline kalendari, quiz dueAt, botda kunlik eslatma (08:00)
- [x] **Sertifikat** — berish/bekor qilish, A4 print-friendly sahifa (PDF chop etish)
- [x] **QR davomat** — sessiya + kod, QR ko'rsatish, talaba check-in sahifasi
- [x] Sidebar yangilandi (Katalog, Kalendar, Sertifikatlar, Hisobotlar)

## DB migratsiyalar

- `wave3`: Announcement, ForumTopic, ForumReply, Certificate, AttendanceSession + Quiz.dueAt

## Modul holati (jami)

| Modul | Holat |
|---|---|
| Auth, profil, rollar | ✅ |
| Kurslar, materiallar, sectionlar | ✅ |
| Topshiriqlar (fayl bilan), baholar, davomat | ✅ |
| Testlar (timer, auto-baho, results API) | ✅ |
| Jadval + Telegram bot (+eslatma) | ✅ |
| Admin, upload, bildirishnomalar | ✅ |
| Katalog, forum, hisobot, kalendar, sertifikat, QR | ✅ |
| Xavfsizlik (review + tuzatishlar) | ✅ |

## Keyingi g'oyalar (P2)

- [ ] Vitest testlar (regressiya himoyasi)
- [ ] Sessiyani bekor qilish (sessionEpoch)
- [ ] PWA (telefonga o'rnatish)
- [ ] uz/ru/en til almashtirish
- [ ] Video/BBB integratsiya

## Holat: `main` yashil
