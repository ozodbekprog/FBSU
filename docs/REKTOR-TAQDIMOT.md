# TTPU Raqamli LMS — Rektor uchun taqdimot ssenariysi

> Bu hujjat universitet rahbariyatiga tizimni ko'rsatish uchun qadam-baqadam qo'llanma.
> Demo akkauntlar, ssenariy, kutilayotgan taassurot va FAQ shu yerda.

## 1. Demo akkauntlar (parol hammasiga: `ttpu1234`)

| Rol | Login | Nima ko'rsatiladi |
|---|---|---|
| Rektor | `rektor@ttpu.uz` | Monitoring paneli, universitet kesimidagi ko'rsatkichlar |
| Dekan | `dekan-ki@ttpu.uz` | Monitoring, fakultet kesimi |
| Kafedra mudiri | `kafedra-di@ttpu.uz` | Monitoring, o'qituvchilar yuklamasi (Workload) |
| Registrator | `registrator@ttpu.uz` | Monitoring, tasdiqlashlar (Approvals), jadval |
| Tyutor | `tyutor-1@ttpu.uz` | Kurator paneli (guruhlar) |
| O'qituvchi | `t.prog@ttpu.uz` | Jurnal, QR davomat, katta ekran |
| Talaba | `ai1s01@ttpu.uz` | Face ID, davomat, baholar, laboratoriya |

> Boshqa o'qituvchilar: `t.math@`, `t.eng@`, `t.mex@`, `t.arch@`, `t.econ@`, `fizika@`, `kimyo@`...

## 2. Universitet tuzilmasi (bazada mavjud)

- **4 fakultet**: Kompyuter injiniringi, Mexanika va texnologiyalar, Arxitektura va dizayn, Iqtisodiyot va boshqaruv
- **9 kafedra**, **6 guruh**, **106 talaba**, **14 o'qituvchi**, **18 rahbar/xodim** (rektor, dekanlar, kafedra mudirlari, registrator, tyutorlar)
- **14 fan/kurs**, haftalik dars jadvali, **2 oylik tarix** (8,672 davomat, 855 test urinishi, 1,353 baholangan ish, rag'bat ballari, og'zaki himoyalar)

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

### Qadam 6 — Ko'p tillilik (30 sek)
1. Profil → til: O'zbek / Русский / English
2. Aytish: *"Xalqaro talabalar uchun to'liq 3 til"*

## 4. Asosiy raqamlar (2 oylik simulyatsiya — jonli bazadan)

- **139 foydalanuvchi**: 106 talaba, 14 o'qituvchi, **18 rahbar/xodim** (rektor, 4 dekan, 9 kafedra mudiri, registrator, 3 tyutor)
- **8,672 davomat yozuvi** — 264 dars sessiyasi, 2 oy davomida
  - Qatnashish darajasi: **93.1%** (kelganlar), kelmagan: 6.9%
  - 435 kechikkan, 377 erta ketgan, 231 shubhali (anti-fraud ishlagan)
- **855 test urinishi** (28 test, 112 savol)
- **1,353 baholangan topshiriq** (44 topshiriq)
- **24 rag'bat ballari**, **30 og'zaki himoya** yozuvi
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
