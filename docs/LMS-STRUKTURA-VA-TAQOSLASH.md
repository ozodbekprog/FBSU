# FBSU LMS — Tizim strukturasi, vakolatlar va raqobatchilar tahlili

> **Sana:** 2026-yil 4-oktabr · **Tayyorladi:** Fariza (Tony topshirig'i bo'yicha)
> **Loyiha:** FBSU LMS — Turin Politexnika Universiteti uchun o'quv boshqaruv tizimi
> **Manbalar:** loyiha kodi (`prisma/schema.prisma`, `src/app/**`, `src/app/api/**`) + ochiq internet manbalari (HEMIS, universitet registratorlari amaliyoti)

---

## 1-QISM. BIZNING SAYT: FBSU LMS

### 1.1. Umumiy tavsif

FBSU LMS — universitet uchun **kompakt o'quv boshqaruv tizimi** (Moodle'ga alternativa: sodda, tez, mobil-qulay).

| Ko'rsatkich | Qiymat |
|---|---|
| Stack | Next.js 16 · React 19 · TypeScript (strict) · Tailwind v4 |
| Baza | PostgreSQL + Prisma 6 |
| Auth | JWT (jose), `ttpu_session` cookie |
| Validatsiya | zod + CSRF himoyasi + rate-limit |
| Interfeys tillari | O'zbek / Rus / Ingliz (i18n) |
| Bot | Telegram bot (long-polling): `/start`, `/help`, `/jadval`, `/ertaga`, `/hafta`, `/davomat`, `/imtihon` |
| Lokal ishlash | `localhost:3000`, DB port 5433 |
| Global (jonli) | **https://fbsu.vercel.app** (Vercel + Neon Postgres) |
| GitHub | github.com/ozodbekprog/fbsu |

### 1.2. Sayt qanday ishlaydi (texnik oqim)

```
Foydalanuvchi → sahifa (Next.js)
    ↓
Middleware / requireUser() → sessiyani tekshiradi (JWT cookie)
    ↓
Server Component → prisma orqali PostgreSQL'dan ma'lumot
    ↓
API route'lar: { ok: true, data } yoki { ok: false, error } formatida
    ↓
Har bir API'da rol tekshiruvi (Talaba / O'qituvchi / Admin)
```

- Sahifalar 3 guruhga bo'lingan: `(auth)` — kirish/ro'yxatdan o'tish; `(app)` — himoyalangan qism (dashboard, kurslar, jadval...); `api/` — REST API (46+ modul).
- **3 ta asosiy rol** (bazada): `ADMIN`, `TEACHER`, `STUDENT` + staff uchun qo'shimcha imkoniyatlar (kurator paneli).
- **Modul yoqish/o'chirish**: administrator 6 modulni (chat, sertifikat, kalendar, katalog, forum, QR davomat) o'yindek yoqib-o'chira oladi — navigatsiya avtomatik moslashadi.

---

### 1.3. Rollar va vakolatlar jadvali

| Imkoniyat / Modul | Talaba | O'qituvchi | Admin |
|---|:---:|:---:|:---:|
| Kurslar, materiallar ko'rish | ✅ | ✅ | ✅ |
| Katalogdan kursga yozilish (enrollment) | ✅ | — | ✅ (boshqaradi) |
| Topshiriq topshirish (fayl bilan, 10MB) | ✅ | — | — |
| Topshiriq yaratish / baholash / feedback | — | ✅ | ✅ |
| Test ishlash (3 savol turi, avtobaho, urinishlar) | ✅ | — | — |
| Test yaratish, savollar banki | — | ✅ | ✅ |
| Dars jadvalini ko'rish | ✅ | ✅ | ✅ |
| **Jadval tuzish (konstruktor)** | — | ✅ (faqat o'z fani) | ✅ (hammasi) |
| Vaqt slotlari, dars turlari, semestr (term) sozlash | — | — | ✅ |
| Davomat belgilash (K/Kech/S/Y) | — | ✅ | ✅ |
| QR davomat sessiyasi ochish | — | ✅ | ✅ |
| QR orqali check-in (talaba o'zi) | ✅ | — | — |
| Jurnal 2.0 (baholar, reyting) | ko'radi | ✅ yuritadi | ✅ |
| Baholar, GPA, transkript | ko'radi | o'z fanida | ✅ |
| **Bonus GPA ball berish** (o'z fani doirasida) | oladi | ✅ | ✅ |
| Sertifikat berish/bekor qilish | ko'radi | ✅ | ✅ |
| E'lonlar, forum | ✅ | ✅ | ✅ |
| Chat (DM), bildirishnomalar | ✅ | ✅ | ✅ |
| Arizalar (orders) yuborish | ✅ | ✅ | ✅ |
| Arizalarni boshqarish (tasdiq/rad) | — | — | ✅ |
| Xona bron qilish (bookings) | ✅ | ✅ | ✅ (boshqaruv) |
| Kurator paneli | — | ✅ | ✅ |
| Hisobotlar + CSV eksport | — | ✅ | ✅ |
| Yuklama (workload) ko'rish | — | ✅ | ✅ |
| Admin panel: foydalanuvchilar, guruhlar, fakultetlar, fanlar, kurslar | — | — | ✅ |
| O'quv kalendari (semestr sanalari) | ko'radi | ko'radi | ✅ boshqaradi |
| Audit jurnali, import, generator, statistika/chartlar | — | — | ✅ |
| Yangilanishlar tarixi (update log), bug bounty | — | — | ✅ |
| AI yordamchi ("Yordam" tugmasi) | ✅ | ✅ | ✅ |
| Telegram bot (jadval/davomat eslatmalari) | ✅ | ✅ | ✅ |

---

### 1.4. "Kim nimani belgilaydi" — qaror nuqtalari

| Qaror / Jarayon | Kim belgilaydi (bizda) | Mexanizm |
|---|---|---|
| **Dars jadvali (vaqt + xona)** | O'qituvchi (o'z fanini) + **Admin** (hammasini) | `/schedule/builder` — drag&drop konstruktor; fan/xona kartochkasini katakka tashlash; **konflikt bo'lsa 409** ("Bu vaqt band") |
| Vaqt slotlari, dars turlari, semestr muddatlari | Faqat **Admin** | Admin panel → sozlamalar; o'qituvchi faqat mavjud slotlardan tanlaydi |
| O'quv kalendari (semestr sanalari, nazorat haftalari) | Faqat **Admin** | `/admin` bo'limida |
| Fanlar (subjects) va o'qituvchi biriktirish | Faqat **Admin** | admin/subjects + teachers |
| Kurs yaratish | O'qituvchi / Admin | O'qituvchi o'z faniga; API'da rol tekshiruvi |
| Baholash (topshiriq, test, jurnal) | **O'qituvchi** o'z fanida; Admin hammasida | `PATCH /api/submissions/[id]`, jurnal |
| Bonus GPA ball | **O'qituvchi** o'z fani doirasida (chegara bor) | bonus-points API + jadval (ledger) |
| Davomat belgilash | **O'qituvchi** (dars oqimida); QR'da talaba o'zi check-in qiladi | 80% qoidasi avtomatik: imtihonga ruxsat/ruxsat yo'q |
| Sertifikat berish | Staff (o'qituvchi/admin) | kurs tugagach, print-friendly A4 |
| Katalogga chiqarish (published) | Staff / Admin | enrollment shundan keyin ochiladi |
| Modul yoqish/o'chirish | Faqat **Admin** | AppSetting (6 modul) |
| Arizalarni tasdiqlash | Faqat **Admin** | `/admin/orders` |
| Imtihonga ruxsat (80% qoidasi) | **Avtomatik** | davomat statistikasidan hisoblanadi |

---

### 1.5. Modullar to'liq ro'yxati

**O'qish:** Dashboard, Kurslar (bo'limlar, materiallar: matn/fayl/video/havola), Topshiriqlar (topshirish tekshiruvi, muddat, baho, feedback), Testlar (3 savol turi, taymer, avtobaho, results API, fokus rejimi), Katalog + enrollment (o'zi yozilish), Tanlov fanlar (electives), Savollar banki, Imtihonlar, Kundaliklar.

**Jadval va vaqt:** Haftalik jadval (kun/ro'yxat, guruh/o'qituvchi/xona rejimlari, "hozingi/keyingi dars" banner, `.ics` eksport, chop etish), Jadval konstruktori (LEGO uslub), Kalendar (deadline'lar), O'quv kalendari.

**Nazorat va baholash:** Davomat + 80% qoidasi + shubhali davomat monitoringi, QR davomat (sessiya + kod), Jurnal 2.0 (mobil uslub, oy navigatsiyasi, reyting top-10), GPA, Bonus GPA ball, Transkript, Baholar, Hisobotlar (+3 xil CSV eksport), Yuklama, Kurator paneli.

**Muloqot:** Chat (DM, unread badge, 5s polling), Forum (mavzular/javoblar, pin), E'lonlar (bildirishnoma bilan), Bildirishnomalar, Telegram bot.

**Xizmatlar:** Arizalar (orders), Xona broni (bookings), Xonalar, Sertifikatlar, Qidiruv, Profil (Facebook-uslub: cover, bio, statistika, `/users/[id]`), Sozlamalar (til, tema), AI yordamchi.

**Boshqaruv:** Admin panel (users, guruhlar + kichik guruhlar, fakultetlar, fanlar, kurslar, arizalar, import, generator), Tahlillar (SVG chartlar: rollar, topshiriqlar dinamikasi, davomat %, top kurslar), Sozlamalar (modul toggle), Audit jurnali, Yangilanishlar tarixi, Bug bounty, Xavfsizlik (CSRF, rate-limit, audit).

---

## 2-QISM. UNIVERSITET BOSHQARUV PRINSIPLARI (NAZARIY MODEL)

Universitet klassik boshqaruv ierarxiyasi:

```
Rektor (strategiya, universitet KPI, hisobot)
  ├─ Prorektor (o'quv) / (ilmiy) / (moliya-xo'jalik)
  ├─ Dekan (fakultet: o'qituvchilar, sifat, tartib)
  │    └─ Kafedra mudiri (fanlar, yuklama, o'qituvchilar)
  ├─ O'quv bo'limi / Registrator (jadval, xonalar, imtihonlar, transkriptlar)
  ├─ Tyutor / Kurator (talabalar bilan ishlash, davomat, qarzlar)
  └─ O'qituvchi → Talaba
```

### Jadval qanday tuziladi (xalqaro amaliyot)

Dunyo universitetlarida dars jadvali **ikki bosqichda** tuziladi:

1. **Kafedra/fakultet** — qaysi fanlar, qaysi o'qituvchi, taxminiy vaqt preferensiyalari (talab kiritadi);
2. **O'quv bo'limi / Registrator ofisi** — hamma kafedra ma'lumotini yig'adi, **xonalarni biriktiradi**, konfliktlarni hal qiladi va yakuniy jadvalni e'lon qiladi.

Misollar (rasmiy registrator qo'llanmalari):
- **UC Davis** — jadval kafedralar va Registrator ofisi hamkorligida; kafedra CLSS tizimiga kiritadi, Registrator xonalarni biriktiradi;
- **USC** — kafedralar kurs taklif qiladi, Registrator deadline qo'yadi, ma'lumotlarni dean'ga hisobot qiladi, xonalarni tayinlaydi;
- **Penn State, Duke, Guelph** — xuddi shu oqim: kafedra → registrator tasdiqlash → e'lon.

**Xulosa:** universitetda jadvalni "bitta odam" emas — **kafedra taklif qiladi, o'quv bo'limi tasdiqlaydi**; o'zgarishlar dekan tasdiqi bilan bo'ladi.

---

## 3-QISM. RAQOBATCHILAR QANDAY ISHLAYDI

### 3.1. HEMIS — O'zbekiston milliy tizimi (eng asosiy raqobat)

HEMIS (Higher Education Management Information System) — O'zbekiston barcha OTMlari uchun **majburiy** (610-son qaror), vazirlik serverlarida, 207+ OTM, 1.6 mln+ talaba.

**Modullari:**
| Modul | Mazmuni |
|---|---|
| Ma'muriy boshqaruv | OTM tuzilmasi (fakultet, kafedra, bo'lim), kadrlar, kontingent, talaba harakati |
| O'quv jarayoni | O'quv reja, kredit-modul, reyting/baholash, davomat, dars jadvali, transkript |
| Ilmiy faoliyat | Nashrlar, intellektual mulk, professor-o'qituvchi faoliyati baholash |
| Moliyaviy boshqaruv | Stipendiya, ish haqi, kontrakt to'lovlari nazorati |

**Rektoriyat darajasi (biz uchun muhim!):** HEMIS'da **"Rahbar" roli — rektor, prorektor, dekan** uchun maxsus monitoring mavjud:
- tyutorlar faoliyati monitoringi (real vaqtda: talabalar soni, o'zlashtirish, davomat, diz. choralar, ijtimoiy holat, to'lovlar, topshiriqlar);
- filtrlash: fakultet / guruh / tyutor bo'yicha;
- statistika va analitika modullari rahbariyat qarorlari uchun.

**Jadval:** HEMIS'da dars jadvali moduli bor (2026-dan 7-kunlik jadval, yuklama boshqaruvi) — universitetning o'quv bo'limi yuritadi, o'qituvchi o'z yuklamasini ko'radi.

**Yangiliklar (2026):** AI chatbot (Gemini/Ollama), Antiplag.uz integratsiyasi, ticket tizimi, transkript qidiruv, Excel eksport, o'quv reja unikalligi, baho tuzatish so'rovlari (o'qituvchi → o'quv bo'limi tasdiqi).

**Kuchli:** markazlashtirilgan, davlat talabi, moliya/kadr bilan integratsiya, rektorat nazorati.
**Zaif:** og'ir interfeys, internet tezligiga bog'liq, universitetning o'z ehtiyojiga moslashtirish cheklangan, sekin ishlash shikoyatlari bor.

### 3.2. Moodle (ochiq kodli standart)

- **Rollar:** Administrator, Manager, Course creator, Teacher, Non-editing teacher (assistent), Student, Guest (+ custom rollar).
- Kurs markazli: har kurs ichida o'qituvchi/talaba rollari; **institutsional ierarxiya yo'q** (rektor/dekan ko'rinishi standart holda yo'q).
- **Jadval tuzish yo'q** — bu LMS, jadval registratorning SIS tizimida bo'ladi (plagin bilan qo'shiladi).
- Rahbariyat analitikasi — faqat plaginlar orqali.
- Yirik (og'ir), moslashtirish qiyin, lekin juda boy funksiyali.

### 3.3. Canvas LMS

- **Rollar:** Account Admin (tizim), Teacher, TA, Designer, Student, Observer; **sub-hisoblar** orqali fakultet ierarxiyasi.
- **SIS integratsiyasi** — registrator tizimidan bo'limlar (sections) va enrollment avtomatik sinxronlanadi; jadval SIS'da tuziladi.
- Admin hisobotlari/analytics bor; ochiq API.

### 3.4. Blackboard Learn

- **Rollar:** Administrator, Instructor, Teaching Assistant, Grader, Student, Observer; institutional hierarchy (fakultet bo'limlari).
- Korporativ (qimmat) tizim; Blackboard Analytics alohida modul.

### 3.5. Google Classroom

- **Rollar:** Teacher, Student, Guardian (ota-ona). Boshqaruv ierarxiyasi, analitika, jadval — yo'q. Universitet uchun emas, maktab darajasiga mos.

### 3.6. Raqobatchilar bo'yicha umumiy xulosa

Xalqaro amaliyotda universitet **LMS + SIS (registrator tizimi)** juftligidan foydalanadi:
- **LMS** (Moodle/Canvas/BB) — o'qitish: materiallar, topshiriqlar, baholar;
- **SIS/registrator** — jadval, xonalar, enrollment, transkriptlar, moliya;
- **HEMIS** — bu ikkalasini + ERP (moliya, kadr) ni bitta milliy tizimda birlashtiradi.

---

## 4-QISM. TAQQOSLASH JADVALI: BIZNING SAYT vs RAQOBATCHILAR

| Funksiya | **FBSU LMS** | HEMIS | Moodle | Canvas | Classroom |
|---|---|---|---|---|---|
| Rollar ierarxiyasi (rektor/prorektor/dekan) | ❌ yo'q (3 rol: admin/o'qituvchi/talaba) | ✅ "Rahbar" roli | ❌ | ⚠️ faqat tizim admin/sub-hisob | ❌ |
| Rektor kabineti / monitoring | ❌ | ✅ (tyutor, davomat, moliya monitoring) | ❌ | ⚠️ hisobotlar | ❌ |
| Dekan / kafedra ko'rinishi | ❌ (faqat fakultet modeli bazada) | ✅ | ❌ | ⚠️ sub-account | ❌ |
| Tyutor/kurator paneli | ✅ (Kurator paneli) | ✅ | ❌ | ❌ | ❌ |
| **Jadval tuzish** | ✅ Konstruktor (o'qituvchi o'z fani + admin) | ✅ (o'quv bo'limi yuritadi) | ❌ (plagin) | ❌ (SIS'da) | ❌ |
| Jadvalni tasdiqlash oqimi (o'quv bo'limi) | ❌ | ⚠️ qisman | ❌ | ❌ | ❌ |
| Xona biriktirish (avtomatik/registrator) | ⚠️ qo'lda (konstruktorda tanlanadi) | ✅ | ❌ | ❌ | ❌ |
| Baholash (topshiriq/test/jurnal) | ✅ | ✅ | ✅ | ✅ | ⚠️ oddiy |
| GPA/kredit tizimi | ✅ (bonus ball bilan) | ✅ (kredit-modul) | ⚠️ plagin | ⚠️ | ❌ |
| QR davomat | ✅ (sessiya+kod, 80% qoida) | ⚠️ | ⚠️ plagin | ⚠️ plagin | ❌ |
| Testlar avtobaho | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Chat / Forum / E'lonlar | ✅ (ichida) | ⚠️ | ✅ forum | ✅ | ⚠️ |
| Analitika (rahbariyat uchun) | ⚠️ admin chartlar | ✅ | ⚠️ plagin | ⚠️ | ❌ |
| Moliyaviy modul (kontrakt, stipendiya) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Ilmiy faoliyat moduli | ❌ | ✅ | ❌ | ❌ | ❌ |
| Akademik buyruqlar (o'tkazish, qoldiq) | ❌ | ✅ | ❌ | ⚠️ SIS'da | ❌ |
| Hujjatlar aylanishi / ticket | ⚠️ bug bounty | ✅ ticket | ❌ | ❌ | ❌ |
| AI yordamchi | ✅ (Yordam + bug assistant) | ✅ (chatbot) | ⚠️ plagin | ⚠️ | ❌ |
| Telegram bot / eslatmalar | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tillar | ✅ UZ/RU/EN | uz/ru | ✅ 100+ | ✅ ko'p | ✅ ko'p |
| O'rnatish/narx | ✅ o'z serveri/Vercel (bepul-ish) | majburiy, markazlashgan | bepul (server kerak) | qimmat litsenziya | bepul (Google) |
| HEMIS bilan integratsiya | ❌ | — | ⚠️ plagin | ⚠️ | ❌ |

---

## 5-QISM. XULOSA

### 5.1. Bizning kuchli tomonlarimiz

1. **Yengil va tez** — HEMIS/Moodle'ga qaraganda ancha sodda, mobil-qulay, zamonaviy UI (3D sidebar, dark mode).
2. **Jadval konstruktori (LEGO uslub)** — drag&drop, konfliktni darrov ushlaydi (409); o'qituvchi o'z fanini o'zi qo'yadi — bu ko'p LMS'larda yo'q.
3. **QR davomat + 80% qoidasi + shubhali davomat** — davomatni avtomatlashtirilgan nazorat.
4. **Bonus GPA ball** — o'qituvchi o'z fani doirasida rag'bat ball bеradi (ledger bilan) — noyob funksiya.
5. **Ijtimoiy qatlam** — chat, forum, e'lonlar, Facebook-uslub profillar.
6. **Telegram bot** — jadval/davomat eslatmalari (Moodle/Canvas'da yo'q).
7. **Jurnal 2.0 + reyting** — mobil uslubdagi jurnal, top-10.
8. **Hisobot + CSV eksport, audit jurnali, xavfsizlik** (CSRF, rate-limit, JWT).
9. **Admin analitika** — SVG chartlar (rollar, davomat %, topshiriqlar dinamikasi).
10. **Modul toggle** — 6 modulni yoqib-o'chirish, nav avtomatik moslashadi.

### 5.2. Universitet prinsiplari bo'yicha yetishmayotgan narsalar

1. **Rahbariyat rollari yo'q** — rektor/prorektor/dekan uchun alohida kabinet va monitoring (HEMIS'da bor, bizda admin panelga jamlangan).
2. **O'quv bo'limi (registrator) roli va tasdiqlash oqimi yo'q** — hozir jadval to'g'ridan-to'g'ri kiritiladi; "kafedra taklif → o'quv bo'limi tasdiq" zanjiri yo'q.
3. **Kafedra modeli yo'q** — bazada faqat fakultet; fan-o'qituvchi biriktirish butunlay admin qo'lida.
4. **Akademik harakatlar yo'q** — buyruqlar (o'qishdan chetlashtirish, qayta o'qish, akademik qoldiq, guruhdan-guruhga o'tkazish).
5. **Moliyaviy modul yo'q** — kontrakt to'lovlari, stipendiya (HEMIS'da asosiy modul).
6. **Ilmiy faoliyat moduli yo'q** — nashrlar, maqolalar, KPI.
7. **HEMIS bilan integratsiya yo'q** — milliy tizimga eksport/import (O'zbekistonda majburiy).
8. **Xona fondini markazlashtirilgan taqsimlash yo'q** — bron bor, lekin avtomatik biriktirish (optimizer) yo'q.

### 5.3. Takliflar (roadmap)

**Birinchi navbatda (P0-P1):**
1. **Rektor/dekan monitoring sahifasi** — mavjud chartlar asosida: fakultet/guruh/yo'nalish bo'yicha filtrlar, davomat+GPA+topshiriqlar KPI.
2. **O'quv bo'limi (registrator) roli** — jadval tasdiqlash oqimi: o'qituvchi taklif qiladi → registrator tasdiqlaydi → talabalar ko'radi.
3. **Kafedra modeli** — Faculty → Department(s) → Subject ierarxiyasi; hisobotlarni kafedra kesimida chiqarish.

**Keyingi (P2):**
4. **HEMIS eksport** — transkript, davomat, reyting ma'lumotlarini standart formatda chiqarish (keyinroq API integratsiya).
5. **Moliyaviy qatlam** — kontrakt holati, to'lov eslatmalari (yoki HEMIS'dan olish).
6. **Akademik buyruqlar** — talaba harakati hujjatlari va tarixi.
7. **Xona "optimizer"** — jadvalda xonalarni avtomatik taqsimlash taklifi.

**Uzoq muddat:**
8. HEMIS/SIS bilan ikki tomonlama sinxronizatsiya; ilmiy faoliyat moduli; tyutor monitoringi (HEMIS v1.8.6 uslubida).

---

## 6-QISM. MUVOFIQLIK TAHLILI: bizning sayt universitet boshqaruv prinsiplariga qanchalik mos?

### 6.1. Baho mezoni: universitet tizimlarining 3 qatlami (dunyo amaliyoti)

Dunyo amaliyotida universitet IT tizimi **3 qatlamdan** iborat:

| Qatlam | Vazifasi | Kim ishlatadi | Misol tizimlar |
|---|---|---|---|
| **LMS** (ta'lim) | Materiallar, topshiriq, test, baholash, muloqot | O'qituvchi, talaba | Moodle, Canvas, Blackboard |
| **SIS** ("rasmiy yozuv tizimi") | Jadval, xonalar, rasmiy enrollment, transkriptlar, baholarning **rasmiy yozuvi**, talaba harakati | Registrator, o'quv bo'limi, rahbariyat | Banner, PeopleSoft, CUNYfirst |
| **ERP** (institut boshqaruvi) | Moliya, kadrlar, ilmiy faoliyat, davlat hisobotlari | Rektorat, buxgalteriya | HEMIS (bizda), SAP, Workday |

> Muhim qoida: **"LMS hech qachon SIS o'rnini bosmaydi — LMS baho ishlab chiqaradi (formativ), SIS uni rasmiy yozuvga aylantiradi (final)."** O'zbekistonda SIS+ERP vazifasini **HEMIS** bajaradi (majburiy).

### 6.2. Rol bo'yicha: dunyo amaliyoti vs bizda

| Rol | Dunyo amaliyotida | Bizda | Moslik |
|---|---|---|---|
| Rektor | Monitoring dashboard (KPI, moliya, davomat) — SIS/ERP'da | ❌ yo'q | ❌ |
| Prorektor (o'quv) | O'quv jarayoni nazorati, o'quv bo'limini boshqarish | ❌ yo'q | ❌ |
| Dekan | Fakultet monitoringi, tasdiqlashlar (masalan, baho o'zgarishi) | ❌ yo'q (bazada faqat fakultet modeli) | ❌ |
| Kafedra mudiri | Fan/o'qituvchi boshqaruvi, baho o'zgarishini tasdiqlash | ❌ yo'q | ❌ |
| O'quv bo'limi / Registrator | Jadvalni yakunlash, xonalar, enrollment, transkript, baho tasdiqi | ❌ alohida rol yo'q (admin bajaradi) | ⚠️ |
| Tyutor / Kurator | Talaba bilan ishlash, davomat/qarz monitoringi | ✅ Kurator paneli (monitoring qismi yo'q) | ⚠️ |
| O'qituvchi | O'z kursi: material, baho, davomat | ✅ kuchli (o'z fani, jadval, bonus GPA) | ✅ |
| Talaba | LMS imkoniyatlari + rasmiy yozuvlarni ko'rish | ✅ kuchli (katalog, QR, GPA, transkript) | ✅ |

### 6.3. Jarayon bo'yicha: dunyo amaliyoti vs bizda

| Jarayon | Dunyo amaliyoti | Bizda | Moslik |
|---|---|---|---|
| Jadval tuzish | Kafedra taklif qiladi → registrator yakunlaydi | O'qituvchi o'zi + admin; tasdiq yo'q | ⚠️ |
| Xona biriktirish | Markazlashgan (registrator/optimizer) | Qo'lda, konstruktorda tanlanadi | ⚠️ |
| Baho qo'yish | LMS'da (o'qituvchi) | ✅ o'qituvchi o'z fanida | ✅ |
| **Bahoni o'zgartirish** | **Tasdiq zanjiri: o'qituvchi → kafedra → dekan → registrator** (UC Davis, UNC, CU Boulder, Michigan) | O'qituvchi to'g'ridan-to'g'ri o'zgartiradi (faqat audit yozuvi) | ❌ |
| Enrollment (kursga yozilish) | Registrator tasdiqlaydi, kredit nazorati | Katalogdan o'zi yozilish (staff boshqaradi) | ⚠️ |
| Transkript | SIS'da rasmiy hujjat | ✅ avtomatik (print) — rasmiy aylanishi yo'q | ⚠️ |
| Akademik buyruqlar (o'tkazish, qoldiq, qayta o'qish) | SIS'da rasmiy buyruqlar | ❌ | ❌ |
| Moliya (kontrakt, stipendiya) | ERP/SIS | ❌ (HEMIS vazifasi) | ❌ |
| Ilmiy faoliyat | ERP modul | ❌ | ❌ |
| Davomat | SIS/LMS | ✅ QR + 80% qoida + shubhali monitoring | ✅ |
| Testlar / formativ baholash | LMS | ✅ avtobaho, urinishlar | ✅ |

### 6.4. Yakuniy hukm: mos keladimi?

**Qisqa javob: QISMAN MOS — ta'lim qatlamida juda yaxshi, boshqaruv qatlamida kichik miqyos uchun yetarli, to'liq universitet standartiga hali to'liq mos emas.**

| Qatlam | Moslik bahosi | Izoh |
|---|---|---|
| LMS (ta'lim) | **~85–90%** | Dunyo LMS'laridan qolishmaydi; ba'zi joyda (QR davomat, bonus GPA, Telegram bot, jadval konstruktori) **ustun** |
| SIS (o'quv boshqaruvi) | **~40–50%** | Jadval, transkript, enrollment bor; **tasdiqlash zanjirlari, registrator roli, xona taqsimoti, buyruqlar yo'q** |
| ERP (institut) | **0–10%** | Moliya, ilmiy, kadrlar yo'q — HEMIS vazifasi |

- **Bitta yo'nalish / kichik kollej miqyosida** — sayt to'liq yetarli (bitta admin hammasini boshqaradi).
- **To'liq universitet miqyosida** — sayt HEMIS bilan **birga** ishlashi kerak: sayt = kundalik ta'lim qatlami, HEMIS = rasmiy SIS/ERP qatlami. Bu dunyo amaliyotiga zid emas — dunyoda ham LMS va SIS doim juftlikda ishlaydi.

### 6.5. Hozirgi holatdagi asosiy xavflar (dunyo amaliyoti bilan solishtirganda)

1. **Bahoni bir tomonlama o'zgartirish** — dunyoda hech qayerda yo'q: kafedra/dekan/registrator tasdig'i shart (audit va akkreditatsiya talabi). Bizda faqat audit jurnali bor, tasdiq yo'q.
2. **Jadvalni tasdiqsiz kiritish** — o'qituvchi o'z vaqtini o'zi qo'yadi; universitetda resurs (xona/vaqt) konfliktlarini markazlashgan boshqaruv talab qiladi.
3. **Registrator nazoratisiz enrollment** — talaba o'zi yoziladi; kredit yuklamasi, qarz, limit nazorati yo'q.
4. **Rasmiy hujjatlar yo'qligi** — buyruqlar, akademik harakat, qayta o'qish jarayonlari rasmiylashtirilmagan.

### 6.6. Minimal harakatlar (dunyo amaliyotiga yaqinlashish)

1. **Baho o'zgartirish tasdiq oqimi** — o'qituvchi so'rov yuboradi → kafedra/registrator tasdiqlaydi (HEMIS'dagi "baho tuzatish so'rovi" uslubida).
2. **Jadval "taklif → tasdiq" rejimi** — o'qituvchi qoralama kiritadi, registrator nashr etadi.
3. **Enrollment tasdiqlash** — katalog yozilishini kurator/registrator tasdiqlaydi.
4. **Rektor/dekan monitoring sahifasi** — mavjud chartlarga fakultet/guruh filtrlari qo'shish.
5. **HEMIS eksport** — transkript, davomat, reytingni standart formatda chiqarish.

---

## 7-QISM. 100% TANISHLIK AUDITI — "LMS'dan o'tgan odam hayron bo'lmasligi" uchun

**Maqsad:** Moodle / Canvas / Google Classroom'dan o'tib kelgan odam bizning saytga kirganda **"Nima bu? Qanday ishlaydi?" demasligi** kerak. Standart LMS elementlarining hammasi tanish joyda va tanish nomda bo'lishi shart. Bizda ortiqcha narsa bo'lsa — afzallik; **kam bo'lsa — kamchilik va tuzatiladi.**

### 7.1. Standart LMS elementlari vs bizda (30 ta tekshiruv)

| # | Standart LMS elementi (Moodle/Canvas) | Bizda | Holat |
|---|---|---|---|
| 1 | Kirish / ro'yxatdan o'tish / parol tiklash | ✅ login, register, forgot/reset-password | ✅ |
| 2 | Demo/test kirish imkoniyati | ✅ login sahifasida demo hisob tugmalari | ✅ |
| 3 | Dashboard ("mening kurslarim", bugungi darslar) | ✅ Dashboard + "Bugungi darslarim" | ✅ |
| 4 | Kurs sahifasi: bo'limlar + materiallar | ✅ (matn, fayl, video, havola) | ✅ |
| 5 | Topshiriqlar: topshirish, muddat, baho, izoh | ✅ fayl topshirish (10MB), baholash, feedback | ✅ |
| 6 | Testlar: savol turlari, urinishlar, avtobaho | ✅ 3 tur, taymer, avtomatik baholash | ✅ |
| 7 | Baholar jadvali / jurnal (gradebook) | ✅ Baholar + Jurnal 2.0 + CSV eksport | ✅ |
| 8 | Baholash mezonlari (syllabus) ko'rsatish | ⚠️ fan ma'lumotlari bor, alohida syllabus sahifasi yo'q | ⚠️ |
| 9 | Davomat | ✅ QR + 80% qoida + shubhali monitoring | ✅+ |
| 10 | Kalendar / deadline'lar | ✅ Kalendar + O'quv kalendari + .ics eksport | ✅ |
| 11 | E'lonlar + forum | ✅ | ✅ |
| 12 | Xabarlar (chat) | ✅ | ✅ |
| 13 | Bildirishnomalar | ✅ + Telegram eslatmalar | ✅+ |
| 14 | Profil | ✅ Facebook-uslub | ✅+ |
| 15 | Qidiruv | ✅ | ✅ |
| 16 | Kurs katalogi / o'zini yozish | ✅ Katalog + Tanlov fanlar | ✅ |
| 17 | Sertifikatlar | ✅ (Moodle'da plagin orqali) | ✅+ |
| 18 | Fayl yuklash | ✅ magic-bytes tekshiruvi bilan | ✅ (⚠️ Vercel'da vaqtinchalik) |
| 19 | Talabalar ro'yxati (roster) | ✅ kurs ichida | ✅ |
| 20 | Kurs yakuni / progress ko'rsatkichi | ⚠️ progress komponenti bor, kurs yakuni % ko'rsatilmagan | ⚠️ |
| 21 | Onboarding / "qanday foydalanaman" | ⚠️ Yordam sahifasi + AI bor; LMS'dan o'tuvchilar uchun qisqa tur yo'q | ⚠️ |
| 22 | Mobil qulaylik | ✅ mobil tab bar | ✅ |
| 23 | Ko'p tillilik | ✅ UZ / RU / EN | ✅ |
| 24 | Email xabarnomalar | ⚠️ mailer mavjud (SMTP), asosiy kanal — ichki + Telegram | ⚠️ |
| 25 | SSO / universitet hisobi bilan kirish | ❌ yo'q (email + parol) | ❌ |
| 26 | Ommaviy import (talaba/o'qituvchi) | ✅ admin/import | ✅ |
| 27 | Rol boshqaruvi (moslashuvchan rollar) | ⚠️ 3 ta qat'iy rol | ⚠️ |
| 28 | Eksport (baholar, transkript) | ✅ CSV + transkript (print) | ✅ |
| 29 | Dark mode / zamonaviy dizayn | ✅ (ko'p LMS'da yo'q) | ✅+ |
| 30 | Statistika (o'qituvchi uchun) | ✅ hisobotlar, chartlar | ✅ |

**Natija: 30 ta elementdan 23 tasi to'liq mos (5 tasi hatto ustun), 6 tasi qisman, 1 tasi yo'q (SSO).**

### 7.2. Atamalar mosligi (terminologiya)

| Standart LMS atamasi | Bizning saytda | Tanishlik |
|---|---|---|
| Course | Kurs | ✅ |
| Section / Topic | Bo'lim | ✅ |
| Assignment | Topshiriq | ✅ |
| Quiz | Test | ✅ |
| Gradebook | Jurnal / Baholar | ✅ |
| Attendance | Davomat | ✅ |
| Announcement | E'lon | ✅ |
| Enrollment | Katalogdan yozilish | ✅ |
| Transcript | Transkript | ✅ |
| Teacher / Student / Admin | O'qituvchi / Talaba / Administrator | ✅ |

### 7.3. "NIMA BU?" xavflari (noyob funksiyalarimiz)

Bizda standart LMS'da yo'q funksiyalar bor — ular tushuntirilmasa, odam hayron qolishi mumkin:

| Noyob funksiya | Xavf | Yechim (kerak) |
|---|---|---|
| QR davomat | "Bu nima, nega kerak?" | Yordam sahifasida qisqa qo'llanma + birinchi kirishda izoh |
| Bonus GPA ball | "Qayerdan qo'shildi?" | Sahifada izoh + o'qituvchi ko'rsatmasi |
| Jadval konstruktori | "Nega jadval LMS'da?" | Izoh: "o'qituvchi o'z fanini joylaydi" |
| Kurator paneli / Kundaliklar / Yuklama | Standart LMS'da yo'q | Yordam bo'limida tushuntirish |
| Arizalar / Xona broni | LMS'da emas, SIS'da bo'ladi | Bo'lim izohi |
| 3D sidebar | Dizayn — funksiyaga ta'sir qilmaydi | — |

### 7.4. 100% moslik uchun qilinadigan ishlar

- **P0:** Yordam sahifasida "LMS'dan o'tganlar uchun" qisqa onboarding + atamalar lug'ati; kurs progressi (%); syllabus sahifasi.
- **P1:** Baho tasdiq oqimi; jadval tasdiq oqimi; rektor/dekan monitoring; kafedra modeli.
- **P2:** HEMIS eksport; email xabarnomalar; SSO (kelajakda); custom rollar.

---

## 8-QISM. MUAAMMOLAR REESTRI (to'liq ro'yxat)

### 8.1. Funksional muammolar (LMS standarti / universitet prinsipi bo'yicha)

| # | Muammo | Muhimlik | Yechim |
|---|---|---|---|
| 1 | Bahoni o'zgartirish tasdiqsiz (faqat audit yozuvi) | P1 | O'qituvchi so'rovi → kafedra/registrator tasdig'i |
| 2 | Jadval tasdiq zanjirisiz kiritiladi | P1 | Qoralama → tasdiq → nashr |
| 3 | O'quv bo'limi (registrator) roli yo'q | P1 | Yangi rol + panel |
| 4 | Rektor/dekan monitoringi yo'q | P1 | Filtrlangan dashboard (chartlar bor) |
| 5 | Kafedra modeli yo'q (faqat fakultet) | P1 | Faculty → Department → Subject |
| 6 | Kurs progressi (yakunlanish %) yo'q | P2 | Progress indikatori |
| 7 | Syllabus (fan dasturi) sahifasi yo'q | P2 | Kurs ichida syllabus bo'limi |
| 8 | SSO / universitet akkaunti bilan kirish yo'q | P2 | SSO kelajakda (email+parol hozircha) |
| 9 | Email xabarnomalar to'liq emas (SMTP sozlanishiga bog'liq) | P2 | SMTP'ni productionga sozlash |
| 10 | Akademik buyruqlar (o'tkazish, qoldiq, qayta o'qish) yo'q | P2 | Hujjat oqimi moduli |
| 11 | Moliya / ilmiy faoliyat modullari yo'q | P3 | HEMIS vazifasi — integratsiya |
| 12 | HEMIS bilan eksport/integratsiya yo'q | P2 | Standart formatda eksport |
| 13 | Xona biriktirish markazlashmagan (qo'lda) | P3 | Registrator tasdig'i bilan biriktirish |
| 14 | A11y (qulaylik) auditi o'tkazilmagan | P3 | Lighthouse/a11y tekshiruv |

### 8.2. Operatsion / texnik muammolar (joriy holat)

| # | Muammo | Holat | Izoh |
|---|---|---|---|
| 1 | Vercel'da fayl yuklashlar vaqtinchalik (`/tmp`) | ⚠️ ochiq | Fayl saqlash uchun R2/S3 kerak |
| 2 | GitHub avto-deploy ulanmagan | ⚠️ ochiq | Hozir CLI orqali deploy qilinadi |
| 3 | `feat/sidebar-3d-icons` branch `main`ga merge qilinmagan | ⚠️ ochiq | Production shu branchda ishlayapti |
| 4 | Lokal `main` branch eski holatda (feat yangiroq) | ⚠️ ochiq | Merge qilinishi kerak |
| 5 | Demo parollar ochiq saytda ko'rinadi (demo maqsadida) | ℹ️ ma'lum | Real foydalanishdan oldin almashtirish kerak |
| 6 | Uploads route Vercel FS'da — rasm tez buzilishi mumkin | ⚠️ ochiq | 1-band bilan birga hal qilinadi |

### 8.3. Tuzatilgan muammolar (2026-10-04, Fariza)

| Muammo | Yechim |
|---|---|
| Sidebar qisqarishi animatsiyasiz sakrardi | 360ms silliq animatsiya + label fade/pill + aktiv oltin puls |
| Qisqarganda hamburger 3D ikonkalar ustiga tushardi | 3D canvas nav chegarasida `clip-path` bilan kesiladi; burger alohida |
| Qisqarganda hamma narsa bitta ustunda emas edi | Logo tepada + bell/oy/burger/nav — bitta vertikal ustun |
| Deploy'da Prisma client keshdan eski olinardi | `--force` bilan keshsiz deploy (barqaror yechim: build'ga `prisma generate` qo'shish) |
| Bonus GPA sahifasi productionga chiqmagan edi | feat branch + migratsiya bilan chiqarildi |

---

## Ilova: manbalar

- **Loyiha kodi:** `prisma/schema.prisma`, `src/app/(app)/**`, `src/app/api/**` (46+ API modul, 116 faylda rol tekshiruvi), `bot/telegram.mjs`
- **HEMIS:** hemis.uz; O'zbekiston Vikipediyasi; dgov.uz; talimxabarlari.uz (v1.8.6 yangilanishi); infoedu.uz; iplex.uz (v1.5.9)
- **Registrator amaliyoti:** UC Davis Office of the University Registrar; USC Academic Records; Penn State; Duke; University of Guelph
- **SIS va LMS farqi:** Blackbaud; lmspedia.org; Classter; EdLink; openSIS; Vidyalaya
- **Bahoni o'zgartirish tasdiq oqimlari (dunyo amaliyoti):** UC Davis Grade Change Tool; UNC-Chapel Hill Registrar; CU Boulder / UCCS; University of Michigan M-Pathways; Kennesaw State

---

*Hujjat FBSU LMS loyihasi uchun tayyorlandi. Savollar bo'lsa — Fariza.*
