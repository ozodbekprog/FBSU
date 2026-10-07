# TTPU Raqamli LMS — Rektor uchun taqdimot ssenariysi

> Bu hujjat universitet rahbariyatiga tizimni ko'rsatish uchun qadam-baqadam qo'llanma.
> Demo akkauntlar, ssenariy, kutilayotgan taassurot va FAQ shu yerda.

## 1. Demo akkauntlar (parol hammasiga: `ttpu1234`)

| Rol | Login | Nima ko'rsatiladi |
|---|---|---|
| Rektor | `rektor@ttpu.uz` | Monitoring paneli, universitet ko'rsatkichlari |
| Prorektor | `prorektor-oquv@ttpu.uz` | Monitoring (o'quv ishlari), universitet ko'rsatkichlari |
| Dekan | `dekan-ki@ttpu.uz` | Monitoring, fakultet kesimi |
| Kafedra mudiri | `kafedra-di@ttpu.uz` | Monitoring, o'qituvchilar yuklamasi (Workload) |
| Registrator | `registrator@ttpu.uz` | Monitoring, tasdiqlashlar (Approvals), jadval |
| Tyutor | `tyutor-1@ttpu.uz` | Kurator paneli (guruhlar) |
| Xodim (farrosh) | `farrosh-1@ttpu.uz` | Keldim/Ketdim, o'z topshiriqlari, QR kod |
| O'qituvchi | `t.prog@ttpu.uz` | Jurnal, QR davomat, katta ekran |
| Talaba | `ai1s01@ttpu.uz` | Face ID, davomat, baholar, laboratoriya |
| Ota-ona | `ota-ona@ttpu.uz` | Farzand davomati, baholari, xabarlar |

> Boshqa o'qituvchilar: `t.math@`, `t.eng@`, `t.mex@`, `t.arch@`, `t.econ@`, `fizika@`, `kimyo@`...

## 2. Universitet tuzilmasi (bazada mavjud)

- **4 fakultet**: Kompyuter injiniringi, Mexanika va texnologiyalar, Arxitektura va dizayn, Iqtisodiyot va boshqaruv
- **9 kafedra**, **6 guruh**, **106 talaba**, **14 o'qituvchi**, **22 rahbar** (rektor, 3 prorektor, 4 dekan, 9 kafedra mudiri, registrator, 3 tyutor, admin) + **13 xizmat xodimi** (farrosh, qorovul, moliyachi, oshxona, tibbiyot, psixolog, haydovchi, bog'bon...) + **ota-ona** demo akkaunti
- **14 fan/kurs**, haftalik dars jadvali, **2 oylik tarix** (8,880 davomat, 1,022 test urinishi, 1,575 baholangan ish)
- **Hujjatlar aylanmasi**: 9 ta normativ buyruq shabloni, imzo zanjiri (Qoralama → Imzoga → Imzolangan), avtomatik raqamlash (`BUY-2026-001`)
- **Moliya**: **106 shartnoma** (1.27 mlrd so'm), **86 to'lov** (852 mln so'm), qarz nazorati
- **QR-diplomlar**: 3 ta diplom + ochiq tekshirish sahifasi
- **"Farroshdan rektorgacha"**: xodim davomati (1,102 yozuv), 16 ish topshirig'i, turniket (557 o'tish)

## 3. 10 daqiqalik demo ssenariy

### Qadam 1 — Rektor kirishi (1 daq)
1. `rektor@ttpu.uz` bilan kiring
2. **Monitoring** bo'limi → universitet ko'rsatkichlari, guruhlar kesimi
3. Aytish: *"Har bir fakultet, kafedra, guruh raqamlashtirilgan — barchasi bitta tizimda"*

### Qadam 2 — O'qituvchi: dars va QR davomat (3 daq)
1. `t.prog@ttpu.uz` bilan kiring (yoki joriy sessiyani davom ettiring)
2. Kurs → **Jurnal** → sessiya boshlang (15 daqiqa)
3. **«Katta ekranda ko'rsatish»** → ekranda ulkan QR
4. Talaba telefoni bilan skanerlaydi (yoki **Demo rejim** → «Talaba skanerladi»)
5. QR 5 sekundda yangilanadi — ekrandagi progress chizig'i
6. Ro'yxatda talaba animatsiya bilan paydo bo'ladi
7. Aytish: *"QR hech kimga ulashilmaydi — 5 sekundda eskiradi, joylashuv va yuz tekshiriladi"*

### Qadam 3 — Talaba: Face ID (2 daq)
1. `ai1s01@ttpu.uz` telefonida → QR skanerlash
2. Face ID: jonli yuz nuqtalari, 3 harakatdan biri (miltillash/tabassum/bosh burish)
3. Davomat tasdiqlanadi — bir sekundda
4. Aytish: *"Yuzni hech kim almashtira olmaydi — jonlilik tekshiruvi bor"*

### Qadam 4 — Laboratoriya (1 daq)
1. Sidebar → **Laboratoriya**
2. Mayatnik: uzunlikni o'zgartiring — animatsiya
3. Gravitatsiya qumi: sharlar tashlang
4. Aytish: *"Fizika va matematika darslari uchun interaktiv simulyatsiyalar — qo'shimcha dastur kerak emas"*

### Qadam 5 — Og'zaki himoya (1 daq)
1. Topshiriq sahifasida **og'zaki himoya** bo'limi
2. Talaba so'rov yuboradi → ustoz qabul qiladi → natija
3. Aytish: *"150 talabani navbat bilan so'roq qilish o'rniga — tizimli, adolatli baholash"*

### Qadam 5.1 — "Farroshdan rektorgacha" (2 daq) 🆕
1. `farrosh-1@ttpu.uz` bilan kirish → **Keldim** bosish → **o'z topshiriqlari** ("201-xonani tozalash") → **Bajarildi**
2. **Turniket**: `/access` kiosk sahifasi → farroshning QR kodini (`/my-qr` dan) skanerlash → "Xush kelibsiz, Z. Abdullayeva" 🟢
3. Aytish: *"Bizda talabagina emas — farroshdan rektorgacha hamma tizimda: davomat, topshiriq, turniket"*

### Qadam 5.2 — Hujjatlar va imzo (2 daq) 🆕
1. `registrator@ttpu.uz` bilan kiring → **Hujjatlar**
2. **Buyruq shabloni**: "Talabani qabul qilish" → talaba tanlang → **Shablonni qo'llash** → matn avtomatik to'ldiriladi (jami 9 shablon: qabul, ko'chirish, tiklash, chetlatish, stipendiya, ta'til, rag'batlantirish, jazo, ishdan bo'shatish)
3. Saqlang → **Yuborish** (imzoga)
4. `rektor@ttpu.uz` ga o'tib → **Imzolash** → hujjat avtomatik raqam oladi: `BUY-2026-001` ✅
5. Aytish: *"Qog'ozbozlik yo'q — loyihadan imzogacha, raqamgacha hammasi tizimda"*

### Qadam 5.3 — Diplomni tekshirish (30 sek) 🆕
1. `/verify/59cef4dc476b` sahifasini oching (telefonda ham)
2. Aytish: *"Har bir diplomda QR kod — ish beruvchi bir sekundda haqiqiyligini tekshiradi"*

### Qadam 5.4 — Moliya va ota-ona (1 daq) 🆕
1. **Moliya**: 106 shartnoma (1.27 mlrd so'm), 852 mln to'langan, qarzlar kesimi
2. `ota-ona@ttpu.uz` → farzand davomati (93%), baholari, bugungi darslari
3. Aytish: *"Ota-ona ham farzandining holatini real vaqtda ko'radi — qo'ng'iroq qilish shart emas"*

### Qadam 6 — Ko'p tillilik (30 sek)
1. Profil → til: O'zbek / Русский / English
2. Aytish: *"Xalqaro talabalar uchun to'liq 3 til"*

## 4. Asosiy raqamlar (2 oylik simulyatsiya — jonli bazadan)

- **156 foydalanuvchi**: 106 talaba, 14 o'qituvchi, 22 rahbar (rektor, 3 prorektor, 4 dekan, 9 kafedra mudiri, registrator, 3 tyutor, admin), 13 xizmat xodimi, 1 ota-ona
- **8,880 davomat yozuvi** — 270 dars sessiyasi, 2 oy davomida
  - Qatnashish darajasi: **93%+** (kelganlar), anti-fraud signallari alohida
- **1,022 test urinishi** (28 test, 112 savol)
- **1,575 baholangan topshiriq** (44 topshiriq), rag'bat ballari, 30 og'zaki himoya
- **Hujjatlar**: 9 shablon, imzo zanjiri, avtomatik raqamlash
- **Moliya**: 106 shartnoma — **1,272,000,000 so'm**; 86 to'lov — **852,000,000 so'm**
- **Diplomlar**: 3 ta QR-diplom, `/verify/...` ochiq tekshirish
- **Xodimlar**: 1,102 davomat yozuvi, 16 topshiriq, 557 turniket o'tishi
- Haftalik dars jadvali: **69 dars**, 14 kurs, 6 guruh, 4 fakultet, 9 kafedra

## 5. HEMIS haqida (agar so'ralsa)

- Institut API ruxsati olinishi bilan to'liq avtomatik integratsiya
- Hozircha: eksport paketi tayyorlash varianti mavjud
- Aytish: *"HEMIS — keyingi bosqich; arxitektura allaqachon tayyor"*

## 6. Ko'p so'raladigan savollar

**Savol: Ma'lumotlar xavfsizmi?**
> Ha: parollar shifrlangan, barcha amallar audit logda, davomat anti-fraud qatlamlari (joylashuv, IP, Face ID, vaqt) bilan himoyalangan.

**Savol: Internet bo'lmasa?**
> Tizim brauzerda ishlaydi; yuz modellari qurilmada keshlanadi. To'liq offline rejim — rejalashtirilgan.

**Savol: Nechta talabani ko'taradi?**
> Hozirgi arxitektura (PostgreSQL + serverless) minglab foydalanuvchiga mo'ljallangan; pilot 2 guruhda sinovdan o'tgan.

**Savol: Biometrik ma'lumotlar saqlanadimi?**
> Yuz rasmi emas — faqat matematik ko'rsatkich (128 raqam) saqlanadi; rasm hech qayerda saqlanmaydi.

**Savol: Qancha vaqtda joriy etiladi?**
> Pilot guruhlarda darhol; fakultet bo'ylab 2-4 hafta (o'qitish + sozlash bilan).

## 7. Texnik talablar (demo oldidan)

- Internet: barqaror Wi-Fi yoki LTE
- Telefon: kamera + brauzer (Safari/Chrome), Face ID uchun yorug' joy
- Laptop: brauzer, to'liq ekran uchun `Esc` chiqishini bilib qo'ying
- Birinchi ochilishda yuz modeli yuklanadi (1-2 sek) — sayt oldindan ochib qo'yilsa yaxshi

## 8. Demo mashqi (tavsiya)

1. Har bir akkaunt bilan bir marta kirib chiqing
2. QR sessiya + katta ekran + demo simulyatsiyani bir marta to'liq o'tkazing
3. Face ID ni o'sha telefonda bir marta sinang (model keshga tushadi)
4. Internet uzilsa — katta ekran rejimi ochiq qolsa ham ro'yxat ishlayveradi
