# Har bir xodim nima qila oladi — to'liq ma'lumotnoma

> TTPU LMS: 10 rol, 155 foydalanuvchi. Har bir rol faqat o'z doirasini ko'radi va qiladi.
> Barcha demo akkauntlar paroli: `ttpu1234`

## 👑 REKTOR — `rektor@ttpu.uz`
**Qila oladi:**
- Butun universitet statistikasi (dashboard)
- Monitoring: fakultetlar, guruhlar, davomat, muammoli talabalar
- Hisobotlar: istalgan kurs (o'qish + eksport)
- Yuklama: barcha o'qituvchilar
- Turniket jurnali (kirish-chiqish)
**Qila OLMAYDI:** baho qo'yish, jadval tahrirlash, foydalanuvchi yaratish (faqat kuzatadi)

## ⭐ PRO_RECTOR — `prorektor-oquv@ttpu.uz`
Rektorga o'xshaydi: monitoring, hisobotlar, yuklama — o'quv jarayoni nazorati.

## 🏛️ DEKAN — `dekan-ki@ttpu.uz`
**Qila oladi:**
- Monitoring: **faqat o'z fakulteti** guruhlari/talabalari
- Hisobotlar va Yuklama: faqat o'z fakulteti o'qituvchilari
- Dashboard: fakultet raqamlari (fakultet kesimida)
**Qila OLMAYDI:** boshqa fakultet ma'lumotlarini ko'rish

## 📋 KAFEDRA MUDIRI — `kafedra-di@ttpu.uz`
- Monitoring: faqat o'z kafedrasi
- Yuklama: o'z kafedrasi o'qituvchilari
- Hisobotlar: o'z kafedrasi kurslari

## 📁 REGISTRATOR (O'quv bo'limi) — `registrator@ttpu.uz`
**Qila oladi:**
- Foydalanuvchilar: talaba/o'qituvchi yaratish, tahrirlash, o'chirish (nofaol qilish)
- Guruhlar + kichik guruhlar boshqaruvi
- Dars jadvali qurish/tasdiqlash
- Tasdiqlashlar (approvals): davomat istisnolari, baho tuzatishlar
- Monitoring + davomat (keng ko'rinish)
- Ariza boshqaruvi (transcript/sertifikat so'rovlari)
**Qila OLMAYDI:** imtiyozli akkauntlarga tegish (admin/rektor/dekan...), rol oshirish

## 👥 TYUTOR — `tyutor-1@ttpu.uz`
**Qila oladi:**
- Kurator paneli: o'z guruhlari — davomat %, GPA, muammoli talabalar, haftalik hisobot
- Guruh tafsiloti: talabalar ro'yxati, xavf belgilari
- Topshiriqlar berish va kuzatish
- Davomat ko'rinishi (o'z guruhlari kurslari)
**Qila OLMAYDI:** baho qo'yish, QR sessiya ochish

## 📚 O'QITUVCHI — `t.prog@ttpu.uz`
**Qila oladi:**
- O'z kurslari: kontent, materiallar, topshiriqlar, testlar
- Jurnal: davomat + baholar
- QR sessiya ochish (kirish/chiqish), katta ekran rejimi, demo simulyatsiya
- Test/topshiriq baholash, og'zaki himoya qabul qilish
- Hisobotlar va yuklama (faqat o'zi)
**Qila OLMAYDI:** boshqa kurslarga kirish

## 💼 XODIM — turli lavozimlar
| Lavozim | Login | Imkoniyatlar |
|---|---|---|
| Farrosh | `farrosh-1@ttpu.uz` | Keldim/Ketdim, topshiriqlar, QR kod |
| Qorovul | `qorovul@ttpu.uz` | **Turniket kioski** (QR skanerlash + jurnal), Keldim/Ketdim |
| Buxgalter | `buxgalter@ttpu.uz` | Keldim/Ketdim, topshiriqlar, QR |
| Moliyachi | `moliya@ttpu.uz` | (moliya moduli keyingi rejada) |
| Kutubxona | `kutubxona@ttpu.uz` | Topshiriqlar, jadval, xonalar |
| IT | `it@ttpu.uz` | Topshiriqlar (texnik ishlar) |
| Tibbiyot | `tibbiyot@ttpu.uz` | Keldim/Ketdim, topshiriqlar |
| Psixolog | `psixolog@ttpu.uz` | Topshiriqlar, talaba bilan suhbatlar jadvali |
| Haydovchi | `haydovchi@ttpu.uz` | Topshiriqlar (xizmat safarlari) |
| Bog'bon | `bogbon@ttpu.uz` | Topshiriqlar (hovli ishlari) |
| Devonxona | `devonxona@ttpu.uz` | Topshiriqlar berish, hujjatlar (keyingi reja) |

**Umumiy:** Keldim/Ketdim belgilash, o'z topshiriqlari, shaxsiy QR, jadval, xonalar, e'lonlar

## 🎓 TALABA — `ai1s01@ttpu.uz`
**Qila oladi:**
- Kurslar, materiallar, topshiriq topshirish, testlar
- Baholar, GPA, transcript, sertifikatlar
- QR davomat (check-in) + **Face ID** (3 harakatli liveness)
- Shaxsiy QR kod (turniket uchun)
- Ariza yuborish (transcript/sertifikat/retake)
- Og'zaki himoyaga so'rov, xabarlar, kutubxona
**Qila OLMAYDI:** boshqalar bahosi, boshqa guruh jadvali, xodim davomati

## 🛡️ ADMIN — `admin@ttpu.uz`
Texnik administrator: barcha modullar, fayllar, struktura, import, generator, audit log, sozlamalar.

---

# 📄 XUJJATLAR TIZIMI — hozirgi holat

## ✅ Tizimlashgan (bor):
| Hujjat | Qayerda | Holat |
|---|---|---|
| **Arizalar** (transcript/sertifikat/retake/other) | Talaba yuboradi → status zanjiri (Yangi→Jarayonda→Bajarildi/Rad) | ✅ To'liq |
| **Transcript** | Chop etish shakli (rasmiy ko'rinish) | ✅ |
| **Sertifikatlar** | Berish + chop etish (raqam, imzo joyi) | ✅ |
| **Imtihon varaqalari** | Sessiya varaqasi chop etish | ✅ |
| **Akademik kalendar** | Tadbirlar/hujjat sanalari | ✅ |
| **Davomat/ball jurnallari** | Elektron jurnal + eksport | ✅ |

## ❌ Yo'q (taklif — keyingi modul):
| Hujjat | Tavsif |
|---|---|
| **Buyruqlar registri** | "Talabalar o'qishdan chetlash" kabi rasmiy buyruqlar: raqam, sana, asos |
| **Xizmat xatlari** | Kirim/chiqim xatlar registri (devonxona) |
| **Shablonlar** | Buyruq/xat/ma'lumotnoma shablonlari (avtomatik to'ldirish) |
| **Ma'lumotnomalar** | Talabaga "o'qish joyidan ma'lumotnoma", xarakteristika |
| **Imzo zanjiri** | Hujjat tasdiqlash yo'li (tuzuvchi → kelishuv → imzo → arxiv) |
| **Arxiv** | Raqamlangan, izlanadigan hujjat arxivi |

> Bu modul ("Hujjatlar aylanmasi" / Document Management) audit backlogga kiritilgan — universitet avtomatlashtirishining muhim qismi.
