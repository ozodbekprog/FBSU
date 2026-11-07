# Changelog — FBSU LMS

Saytda ko'rinadigan relizlar ro'yxati: `/versions`.
Versiya manbasi: `src/lib/version.ts`.

## [1.0.0-beta.2] — 2026-11-07

### Qo'shildi

- Point/kredit tizimi: rektor hamyoni, VIP kredit, butun sonli bonus ballar va ularni fanlarga taqsimlash.
- 30 ballik fan shkalasi va 240 kreditlik diplom modeli.
- Talaba dashboardida "Mening ballarim" kartasi; bonus/kredit sahifalari FBSU navy+gold palitrasida.
- Hisob xavfsizligi: 2 qurilma limiti, Telegram orqali tasdiqlash va login jurnali.
- Telegram mini app: webhook, avtomatik kirish va qurilma limitini boshqarish.

### O'zgartirildi

- Dars jadvali Toshkent vaqti bo'yicha hisoblanadi.
- `/api/version` va `/versions` sahifasi `1.0.0-beta.2` ni ko'rsatadi.

## [1.0.0-beta.1] — 2026-10-17

### Qo'shildi

- Ofis moduli: Word, Excel va PowerPoint muharrirlari, avtosaqlash, PDF/CSV eksport.
- Ofis barcha rollar uchun ochildi, shu jumladan talabalar uchun.
- `/versions` relizlar tarixi sahifasi va sayt bo'ylab beta belgisi.
- `GET /api/version` — joriy versiya va relizlar ro'yxati.

### O'zgartirildi

- Rasmiy hujjatlar registri ofis fayllaridan tozalandi.
- Loyiha versiyasi `0.1.0` dan `1.0.0-beta.1` ga ko'tarildi.

## [0.9.0] — 2026-10-17

- Baholar jurnali: ustunlarni topshiriq/test bilan bog'lash, bulk amallar.
- Kurs eksport/import (v2), CSV eksport, topshiriq muddatini uzaytirish.
- Testlar: MATCHING/ORDERING savol turlari va so'rovnoma moduli.
- Glossariy, mobil API v1, rollar va capability tizimi.

## [0.5.0] — 2026-10-15

- Xavfsiz imtihon: QR kirish, yuz nazorati (face guard), kiritma anomaliyasi.
- EduPage avto jadval sinxronizatsiyasi.
- OWNER roli, Telegram 2FA va audit zanjiri.

## [0.1.0] — 2026-09-17

- Auth, kurslar, topshiriqlar, testlar, davomat va admin panel.
- PostgreSQL + Prisma, Next.js App Router va Tailwind UI kit.
- Landing sahifa va demo ma'lumotlar bazasi.
