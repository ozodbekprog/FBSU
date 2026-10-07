# Universitet rollari — vakolatlar tahlili va solishtirish hisoboti

> Sana: 2026-10-07 · Holat: **Tahlil** (o'zgarishlar "boshla" buyrug'idan keyin kiritiladi)
> Maqsad: har bir xodimga LMS faqat **o'ziga kerakli** bo'limni ko'rsatsin — ortiqcha ruxsat berilmasin.

## 1. Hozirgi holat (bizning tizim)

| Bo'lim / imkoniyat | Hozir kim kira oladi | Cheklov (scope) |
|---|---|---|
| Dashboard, Kurslar, Jadval | Hamma | — |
| **QR davomat sessiyasi** (ochish) | O'qituvchi, Admin | Faqat o'z kursi |
| Jurnal / baholash / test yaratish | O'qituvchi, Admin | Faqat o'z kursi |
| **Monitoring** | Admin, Rektor, Prorektor, Dekan, Kafedra mudiri, Registrator | Dekan — o'z fakulteti, Kafedra — o'z kafedrasi guruhlari |
| **Tasdiqlashlar** (Approvals) | Admin, Registrator | — |
| Kurator paneli | O'qituvchi, Admin, **Tyutor** | Tyutor — o'z guruhlari |
| **Hisobotlar** (Reports) | O'qituvchi, Admin | O'qituvchi — o'z kursi |
| **Yuklama** (Workload) | O'qituvchi, Admin | O'qituvchi — o'zi; Admin — hamma |
| Admin panel (users, guruhlar, jadval, generator...) | Faqat Admin (17 sahifa) | — |
| Davomat sahifasi | Hamma | Talaba — o'zi; boshqalar — umumiy "staff" ko'rinish |
| Laboratoriya, Kutubxona(asoslar), Messenjer, Xonalar, E'lonlar | Hamma | — |
| Og'zaki himoya | Talaba (so'rov), O'qituvchi (qaror) | — |
| Face ID | Talaba (o'zi) | — |

**Xulosa:** QR va baholash to'g'ri cheklangan (tyutor/registratorga berilmagan). Asosiy kamchilik — **rahbariyat rollari uchun analitika (Hisobot/Yuklama) yopiq** va **registrator vakolatlari tor**.

## 2. Xalqaro amaliyot (Moodle / Canvas / HEMIS namunasi)

| Rol | Nima ko'rishi kerak | Nima qila olishi kerak | Nima TAQIQLANADI |
|---|---|---|---|
| **Rektor** | Butun universitet analitikasi (davomat, GPA, yuklama, faollik) | Hech narsani o'zgartirmaydi (faqat kuzatadi) | Baholash, jadval tahriri |
| **Prorektor** | Fakultetlar kesimi, akademik sifat | Akademik istisnolar tasdiqlash (ixtiyoriy) | Texnik sozlamalar |
| **Dekan** | O'z fakulteti: guruhlar, o'qituvchilar, davomat, yuklama | Fakultet darajasida jadval o'zgarishini tasdiqlash | Boshqa fakultet ma'lumotlari |
| **Kafedra mudiri** | O'z kafedrasi: o'qituvchilar yuklamasi, fan natijalari | Yuklama taqsimlash taklifi, fan biriktirish | Talaba bahosini tahrirlash |
| **Registrator (O'quv bo'limi)** | Talabalar, guruhlar, jadval, imtihonlar, davomat istisnolari | Talaba/guruh boshqaruvi, jadval qurish, baho o'zgarishini tasdiqlash | Kurs kontenti, baholash |
| **Tyutor** | O'z guruhlari: davomat, xavf (dropout radar), aloqa | Talaba bilan ishlash qaydlari | Baho qo'yish, QR ochish |
| **Xodim (buxgalter, IT...)** | E'lonlar, jadval, xonalar, profil | Xona band qilish, so'rovlar | Akademik ma'lumotlar |
| **O'qituvchi** | O'z kurslari | Kontent, baho, QR davomat, testlar | Boshqa kurslar |
| **Talaba** | O'z o'qishi | Topshiriq, test, davomat, Face ID | Boshqalar ma'lumoti |

## 3. Solishtirish: bo'shliqlar (gap analysis)

| # | Bo'shliq | Hozir | Bo'lishi kerak | Muhimlik |
|---|---|---|---|---|
| G1 | **Hisobotlar** rahbariyatga yopiq | Faqat o'qituvchi/admin | Dekan, Kafedra mudiri, Prorektor, Rektor (scoped) | 🔴 Yuqori |
| G2 | **Yuklama** — kafedra mudiri o'z kafedrasini ko'rmaydi | Faqat o'zi/admin | Kafedra — kafedrasi, Dekan — fakulteti | 🔴 Yuqori |
| G3 | **Registrator** talaba/guruh boshqaruviga kira olmaydi | Faqat admin panelda, ADMIN-only | Registratorga: talabalar, guruhlar, jadval (xavfsiz bo'limlar) | 🔴 Yuqori |
| G4 | **Tyutor** monitoringi yo'q | Faqat kurator paneli | O'z guruhlari davomati + xavf radari | 🟡 O'rta |
| G5 | Davomat sahifasi — barcha staff bir xil keng ko'rinish | Umumiy "staff" ko'rinish | Tyutor — guruhlari; rahbariyat — scoped | 🟡 O'rta |
| G6 | Monitoring API'lari scope tekshiruvi | Sahifa scoped, API'lar qisman | Har bir API darajasida scope audit | 🟠 O'rta-yuqori (xavfsizlik) |
| G7 | Xodim uchun ko'rinish | Hamma umumiy narsani ko'radi | E'lonlar/jadval/xonalar yetarli — maxsus hech narsa kerak emas | 🟢 Past |
| G8 | QR / baholashga ruxsatlar | ✅ To'g'ri (tyutor/registratorga yo'q) | O'zgarishsiz | — |
| G9 | Tasdiqlashlar (approvals) | Admin + Registrator | O'zgarishsiz (standartga mos) | — |

## 4. Taklif etiladigan reja ("boshla" deyilsa)

### Bosqich 1 — Rahbariyat analitikasi (G1, G2, G5)
- Hisobotlar va Yuklama sahifalariga **Dekan / Kafedra mudiri / Prorektor / Rektor**ni qo'shish
- Har biriga **scope filtr**: kafedra — o'z kafedrasi, dekan — fakulteti, prorektor/rektor — hammasi
- Davomat "staff" ko'rinishini tyutor uchun guruhlariga cheklash
- Testlar + jonli E2E (har rol bilan)

### Bosqich 2 — Registrator vakolatlari (G3)
- Registratorga ochiladi: **Talabalar** (ko'rish/tahrir), **Guruhlar**, **Jadval qurish** (bor), **O'quv kalendar**
- Ochilmaydi: kurs kontenti, baholash, tizim sozlamalari, audit
- Yangi "cheklangan admin" rejimi + audit log

### Bosqich 3 — Tyutor radari (G4)
- Kurator sahifasiga davomat foizi, ketma-ket kelmaganlar, "xavf" belgisi
- Faqat o'z guruhlari (allaqachon shunday)

### Bosqich 4 — Xavfsizlik auditi (G6)
- Barcha monitoring/reports API'larida rol + scope tekshiruvini tekshirish
- Har bir rol uchun avtomatik ruxsat testlari (matrix test)

## 5. Xavfsizlik tamoyillari (o'zgarmaydi)

- Har bir sahifa + API **ikki qavatda** tekshiriladi (proxy + requireRole/canManageCourse)
- Yangi ruxsatlar faqat **tor scope** bilan beriladi (fakultet/kafedra/guruh)
- Barcha muhim amallar **audit log**ga yoziladi
- QR / baho / Face ID ruxsatlari **o'zgarishsiz** — talaba/o'qituvchi/admin uchburchagida qoladi

---

## ✅ YAKUNIY HOLAT (2026-10-07): Barcha bosqichlar BAJARILDI

| Bosqich | Nima | Natija |
|---|---|---|
| 1 | Rahbariyat analitikasi (Hisobot+Yuklama, scope bilan) | ✅ 23/23 test |
| 2 | Registrator vakolatlari (talabalar+guruhlar, cheklovlar bilan) | ✅ 16/16 test |
| 3 | Tyutor radari (guruh tahlili: davomat%, GPA, muammolilar) | ✅ 6/6 test |
| 4 | Xavfsizlik auditi (3 parallel agent: 4 YUQORI + 12 O'RTA topilma) | ✅ 16/16 test |
| 4+ | Fayl egalik himoyasi (submissions faqat egasi/o'qituvchi/admin) | ✅ 7/7 test |

**Qolgan (tashqi qarorlar kutilmoqda):**
- Telegram bot (bot tokeni kerak) + Redis rate-limit (Redis infratuzilmasi kerak)
- Rahbarlar haqiqiy ismlari (Tony beradi)
- Onlayn doskani qaytarish (Tony xohlaganda 1 qatorlik ish)
