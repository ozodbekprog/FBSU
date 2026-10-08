# Raqib tahlili: lms.turin.uz ("UniStudy") vs FBSU LMS

> **Sana:** 2026-yil 6-oktabr · **Kim:** Fariza (Tony topshirig'i bo'yicha, jonli tekshiruv)
> **Raqib:** https://lms.turin.uz/student — TTPU (Turin Politexnika) talabalar tizimi, loginda "Developed by Ravshan Umaraliev"
> **Metod:** raqibga talaba akkaunti bilan kirilib, 14 sahifa ko'rildi (dashboard, jadval, kurslar, topshiriqlar, imtihonlar, tanlov fanlar, baholar, davomat, GPA, transkript, arizalar, xonalar, chat, pochta, sozlamalar) + bildirishnoma, global qidiruv, kurs ichi.
> **Bizning tomon:** `localhost:3000` (dev), `ozodbek@ttpu.uz` demo talaba hisobi, 10+ sahifa tekshirildi.
> **Cheklov:** raqibning faqat **talaba** kabineti ko'rildi — o'qituvchi/admin qismi akkauntda yo'q.
> **Skrinshotlar:** `audit/raqib-lms-2026-10-06/screens/` (raqib-*.jpeg, fbsu-*.jpeg)

---

## 1. Qisqa xulosa (TL;DR)

| | |
|---|---|
| **Raqib nima?** | TTPU uchun yozilgan ishlayotgan talaba kabineti (UniStudy). Kuchli tomoni — **haqiqiy integratsiyalar** (EduPage jadval, buxgalteriya/PINFL, `@turin.uz` pochta, QR ma'lumotnoma) va **silliq UI** (light tema, 3D ikonkalar, EN/RU/UZ). |
| **Biz unga qaraganda kuchli** | Test (quiz) dvigateli, davomat (QR + Face ID + 80% qoidasi), o'qituvchi vositalari (Jurnal 2.0, LEGO jadval konstruktori), keng rollar (rektor/registrator/tyutor), Telegram bot, AI yordamchi, forum/e'lon, sertifikat, hisobotlar, xavfsizlik, dark mode. |
| **Ular oldinda** | Pochta (university mail), kontrakt/moliya ko'rinishi, "sababli" davomat uchun hujjat oqimi, rasmiy ma'lumotnoma (QR bilan), EduPage-real ma'lumotlar bilan sinxron, Telegram orqali parolsiz kirish. |
| **Asosiy xavf** | Raqib universitetning haqiqiy jarayonlariga ulangan (jadval, hisob, pochta). Agar biz ular bilan **integratsiya nuqtalarini** qo'shmasak, funksiya ko'pligi yetarli ustunlik bermaydi. |

---

## 2. Sahifama-sahifa taqqoslash (talaba tomoni)

| Modul | Raqib — lms.turin.uz | Biz — FBSU LMS | Holat |
|---|---|---|---|
| **Dashboard** | Salomlashish, guruh, 4 ta karta (O'rtacha /30, Xabarlar, Davomat, Kredit 0/30), Bugungi darslar, 2 haftalik deadline, Joriy baholar, **Kontrakt va qarz (PINFL)** | Salomlashish, guruh, sana chipi; tezkor tugmalar (Davomat/Jadval/Topshiriqlar/Testlar), QR davomat karta, "Bugungi holat" (4 kurs, 2 dars, 3 topshiriq), Bugungi darslar, Yaqin topshiriqlar | ✅ teng (bizda QR/AI qo'shimcha, ularda kontrakt) |
| **Jadval** | Haftalik to'r, 1–8 para (09:00–21:40), lecture/practice ranglari, o'qituvchi+xona; guruh/o'qituvchi rejimi; "Add to calendar"; **manba: EduPage snapshot** (week 8 / 1.1_26_27) | Haftalik to'r, 1–8 para, holat ranglari (Dars/O'zgargan/Ko'chirilgan/Bekor + izoh), bugun ustuni, juft/toq hafta, Jadval/Ro'yxat, `.ics` eksport, Chop etish, guruh/o'qituvchi/xona | 🏆 bizda boyroq UX; ⚠️ ular real ma'lumotga ulangan |
| **Bildirishnomalar** | Jadval o'zgarishi avto-xabarlari ("Dars jadvali o'zgardi…", "va yana 3 ta"), o'qilgan belgilash | Bildirishnomalar API + badge; bekor qilinganda guruhga avto-xabar; Telegram eslatmalar | ✅ teng |
| **Kurslar** | Progress %, olingan/jami kredit (0/30), Year/Semester, kurs kartasi: kod (1107), o'qituvchi, kredit, semestr | 4 kurs rangli karta, o'qituvchi, materiallar soni; kurs ichida bo'limlar/materiallar, topshiriqlar, testlar | ✅ teng |
| **Kurs ichi** | Modullar + materiallar (pptx, "Document"), Materials/Grades/Assignments tablari | Bo'limlar + materiallar (matn/fayl/video/havola), topshiriq topshirish (fayl 10MB), testlar, jurnal | ✅ bizda topshirish integratsiyasi bor |
| **Topshiriqlar** | Hisob kartalari (Jami/To submit/Submitted), bo'sh holat | Ro'yxat + muddat + baho + feedback; o'qituvchi baholaydi | ✅ teng |
| **Testlar / Imtihonlar** | "Online exams" (Open/Upcoming/Ended), My exams, **Retakes** tabi | Imtihon sessiyalari (sana/xona/o'rindiq/ruxsat) + **nazorat ishlari (quiz)**: 3 savol turi, taymer, avtobaho, urinishlar; "qayta topshirish" arizasi | 🏆 bizda quiz dvigateli chuqurroq |
| **Tanlov fanlar** | Kredit bloklari, majburiy/qoldiq, "curriculum ulanmagan" holati | "Tanlov fanlar" katalogi (0 ta e'lon qilingan) | ✅ teng (ikkisi ham hozir bo'sh) |
| **Baholar** | Vaznli o'rtacha /30, kredit, akademik qarzlar; fan bo'yicha | Fan bo'yicha baholar, 80% davomat badge'lari, donut o'rtacha, **Reyting #1** (guruh ichida medallar) | 🏆 reyting bizda; ⚠️ shkala: ular /30, biz 4.0 GPA |
| **GPA** | /30 vaznli + **/110 diplom bahosi**, 18/30 o'tish, "30L honours" qoidalari | 4.0 tizim, bonus ballar, kredit hisobi, shkala legendasi | ⚠️ turli shkala — universitet talabiga moslash kerak |
| **Transkript** | Rasmiy ko'rinish **+ Download PDF**, "Data as of" | To'liq rasmiy shablon (ID, imzo/muhr joyi, fan×ustun jadval, GPA, shkala) + Chop etish | 🏆 bizda tayyor shablon; ⚠️ PDF yuklab olish qo'shish oson |
| **Davomat** | Present/Absent/Late, fan bo'yicha, **Excuse notes (hujjat yuklab tyutor tasdiqlaydi)**, log | QR check-in, 100% donut, 80% qoidasi (Ruxsat bor/yo'q), fan bo'yicha + **Jurnal** havolasi, so'nggi yozuvlar; holatlar: Keldi/Shubhali/Kechikdi/Vaqtli tark etdi/**Sababli**/Kelmadi | ✅ bizda QR/Face ID; ⚠️ hujjat bilan "Sababli" oqimi ularda |
| **Pochta (Mail)** | `ozodbek.khoshimov@turin.uz` — Compose/Inbox/Sent/Drafts/Trash, qidiruv | ❌ yo'q (faqat chat + Telegram) | ⚠️ bo'shliq |
| **Chat** | All/Courses/Direct filtrlari, kurs guruh chati, "Find a person" | DM chat (student↔teacher↔admin), kurs chatlari?, unread badge, 5s polling, foydalanuvchi qidiruvi, flood himoya | ✅ teng (ularda kurs chatlari ko'proq ko'rinadi) |
| **Arizalar (Orders)** | Dekan arizalari; **ma'lumotnoma bir zumda raqam + QR bilan**; Pending/Approved/Rejected | Ariza turlari: Transkript/Ma'lumotnoma/Qayta topshirish/Boshqa; holat timeline; 60% dan pastga qayta topshirish | ✅ teng; ⚠️ QR-li rasmiy hujjat yetishmaydi |
| **Xona broni** | Sessiya vaqtida ochiladi; so'rovlar Pending/Approved | Xona/sana/para tanlash, faol bronlar, bekor qilinganlar | ✅ teng |
| **Qidiruv** | ⌘K global ("Navigate, find users, courses, groups, tasks and more") | `/search` sahifasi (kurslar, materiallar, topshiriqlar, testlar, foydalanuvchilar) | ✅ teng; ⌘K shortcut qo'shsa bo'ladi |
| **Sozlamalar** | Profil, rasm, shaxsiy ma'lumot, hujjatlar, parol; PINFL; PAYMENTS | Profil, tema, til, xavfsizlik | ⚠️ ular profil sozlamalarini birlashtirgan |
| **Kirish** | Login/parol, **Sign in with Telegram**, Register | Login/parol + demo hisoblar, Register | ⚠️ Telegram login yo'q (botimiz bor) |
| **Til** | EN/RU/UZ (to'liq tarjima) | UZ/RU/EN | ✅ teng |
| **Tema** | Light (toggle ko'rinmadi) | Light/Dark toggle | 🏆 bizda |
| **Yordam** | "Report a problem" tugmasi | `/help` + **AI Yordam** (floating) | 🏆 bizda AI |

---

## 3. Raqibning kuchli jihatlari (dalillar bilan)

1. **EduPage jonli integratsiya.** Jadval sahifasi tagida: *"Timetable data comes from the university's EduPage system, not from UniStudy · Snapshot: week 8 / 1.1_26_27 (4/10–11/10/2026)"*. Ya'ni jadval universitetning haqiqiy tizimidan olinadi. Ustiga **jadval o'zgarishi bildirishnomalari avtomatik** chiqadi ("Dars qo'shildi: Startup Workshop, chorshanba 14:20", "va yana 3 ta").
2. **Rasmiy hisob bilan bog'liqlik:** dashboard'da **PINFL** kiritish → "buxgalteriya tizimi sizni topadi", kontrakt va qarz bo'limi, PAYMENTS. Talaba moliyaviy holatini ko'radi.
3. **Universitet pochtasi** (`@turin.uz`): Compose, Inbox, Sent, Drafts, Trash — to'liq pochta klienti.
4. **Rasmiy hujjatlar bir zumda:** ma'lumotnoma "raqam va QR bilan darhol beriladi — dekanatga borish shart emas". Arizalar Pending/Approved/Rejected holatlari bilan.
5. **Excuse notes:** tibbiy yoki boshqa hujjat rasmini yuklab, tyutor tasdiqlaydi — davomatdagi yo'qlik "sababli"ga o'tadi va hisobdan chiqariladi.
6. **Baholash shkalasi universitetnikiga mos:** /30 vaznli o'rtacha, 18/30 o'tish, /110 diplom bahosi, "30L honours" qoidalari — TTPU kredit-modul reglamentining rasmiy mantiqi.
7. **Sayqallangan UI/UX:** izchil bo'sh holatlar (empty states) hamma sahifada, skeleton loading, 3 ta til to'liq, ⌘K qidiruv, Telegram bilan parolsiz kirish.
8. **Ikonka/illustratsiya tizimi:** 3D emoji uslubidagi ikonkalar, rangli statistik kartalar — talabaga "zamonaviy ilova" taassuroti.

---

## 4. Bizning ustunliklarimiz (🏆)

1. **Test dvigateli** — 3 xil savol turi, taymer, avtobaho, urinishlar, natijalar API, fokus rejimi. Raqibda "online exam" bor, lekin savol turlari va avtobaho chuqurligi ko'rinmadi.
2. **Davomat ekotizimi** — QR sessiya + Face ID check-in + 80% qoidasi + "Shubhali" monitoring. Raqibda oddiy ro'yxat va hujjat oqimi.
3. **O'qituvchi vositalari** — Jurnal 2.0 (mobil uslub, K/Kech/S/Y badge, oy navigatsiyasi, top-10 reyting), **LEGO jadval konstruktori** (drag&drop, konflikt 409), yuklama, kurator paneli.
4. **Rollar tizimi** — REKTOR, REGISTRATOR, TYUTOR, TEACHER, ADMIN; har biriga kabinet/ruxsatlar. Raqibda faqat talaba tomonini ko'rdik.
5. **Telegram bot** — `/jadval`, `/ertaga`, `/hafta`, `/davomat` + 08:00 eslatmalar. Ularda faqat "link Telegram" va login.
6. **AI yordamchi** — interfeys ichida floating "AI Yordam".
7. **Kontent modullari** — forum (pin), e'lonlar, katalog/enrollment, sertifikatlar (A4 print), laboratoriya, o'quv kalendari, xonalar katalogi.
8. **Admin quvvat** — import/generator, audit jurnali, modul toggle (6 modul), SVG chartli tahlillar, 3 xil CSV eksport, xavfsizlik (CSRF, rate-limit, review).
9. **Dark mode + onboarding tur + demo hisoblar** — taqdimot va qabul uchun qulay.
10. **Sifat jarayoni** — `npm run build` majburiy, e2e testlar, audit hisobotlari, CONTRACT bilan disiplina.

---

## 5. Ustuvor tavsiyalar

### P1 — tez, arzon, ko'zga tashlanadi
1. **"Sababli" davomat uchun hujjat oqimi**: talaba rasm/PDF yuklaydi → tyutor tasdiqlaydi → holat "Sababli". (Xona, API, UI — 1 modul.)
2. **Ariza → ma'lumotnoma QR bilan**: ariza tasdiqlanganda raqam + QR generatsiya qilib, PDF yuklab olish.
3. **Kurs ichiga "Baholar" va "Topshiriqlar" tablari** (hozir alohida sahifalarda — kurs kontekstida ham ko'rsatish).
4. **Login sahifasiga "Telegram bilan kirish"** — bot allaqachon bor, login-deeplink qo'shish kifoya.
5. **Loading holatlarni standartlashtirish** — barcha sahifalarda skeleton; dev'da kuzatilgan "Yuklanmoqda…" qotib qolishi holatini prod build'da qayta tekshirish.
6. **⌘K global qidiruv shortcut** — `/search` mavjud, klaviatura tez ochilishini qo'shish.

### P2 — strategik integratsiya
7. **EduPage/HEMIS sinxron nuqtalari** — jadval import (talabalar real jadvalni ko'rsin), eksport (transkript/davomat standart formatda).
8. **Kontrakt/qarz ko'rinishi** — PINFL maydoni + HEMIS/buxgalteriya bilan almashinuv (hatto qo'lda import bo'lsa ham).
9. **Universitet pochta yoki xabarnoma** — mail. student@... pochtasi bo'lmasa, muhim xabarlarni chat/Telegram orqali rasmiy ko'rinishda.
10. **Baholash shkalasi mosligi** — agar universitet TTPU kabi /30+/110 talab qilsa, GPA sahifasiga ikkinchi shkala qo'shish (4.0 ni saqlab).

### P3 — sayqal
11. "Report a problem" tugmasi (yoki mavjud AI/Yordam'ga tezkor "muammo" tugmasi).
12. Rasmiy hujjat shablonlarini universitet blanklariga moslash, PDF eksport.

---

## 6. Ilova: sahifalar xaritasi

**Raqib (student):** `/student`, `/student/schedule`, `/student/courses`, `/student/assignments`, `/student/exams`, `/student/electives`, `/student/grades`, `/student/attendance`, `/student/gpa`, `/student/transcript`, `/student/orders`, `/student/bookings`, `/student/messages`, `/mail`, `/student/settings`.

**Bizning sidebar (talaba):** Dashboard, Kurslar, Laboratoriya, Katalog, Tanlov fanlar, Jadval, Kalendar, O'quv kalendari, Imtihonlar, Baholarim, GPA, Transkript, Davomat, Sertifikatlar, Xabarlar, Arizalar, Xona broni, Xonalar, Qidiruv, Yordam, Sozlamalar + AI Yordam + QR davomat (dashboard) + Onboarding tur.

**Taqqoslash uchun bizning ekvivalentlar:** dashboard ✅, jadval ✅ (boyroq), kurslar ✅, topshiriqlar ✅ (kurs ichida), testlar ✅ (chuqurroq), imtihonlar ✅, tanlov fanlar ✅, baholar ✅, GPA ✅ (boshqa shkala), transkript ✅ (PDF+chop), davomat ✅ (QR/Face ID; hujjat oqimi yo'q), pochta ❌, chat ✅, arizalar ✅ (QR hujjat yo'q), xona broni ✅, qidiruv ✅, sozlamalar ✅, Telegram login ❌ (bot ✅), til ✅, tema ✅, AI ✅.

---

## 7. Kuzatilgan mayda nuqsonlar (bizda)

- `npm run dev` paytida `/dashboard` bir holatda "Yuklanmoqda…" da qotib qoldi (HMR/dev artefakti bo'lishi mumkin) — **prod build'da tekshirish kerak**.
- Login sahifasida tugma bosilishi ba'zan hidratsiyagacha ishlamaydi (dev) — disable holatini hidratsiyaga qadar ko'rsatish mumkin.
- Chat sahifasi skrinshot paytida skelet holatida edi — yuklanish tezligini tekshirish (5s polling + conversations API 900ms).
- Sidebar pastida "Chiqish" tugmasi qirqilib ko'rinadi — padding/overflow tekshirish.

---

*Hisobot jonli tekshiruv asosida; raqib sayti o'zgarishi mumkin. Skrinshotlar: `screens/` papkasi.*
