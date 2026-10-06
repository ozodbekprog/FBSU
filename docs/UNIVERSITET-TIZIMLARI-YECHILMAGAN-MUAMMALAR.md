# Universitet tizimlarida yechilmagan muammolar
## Global tahlil va O'zbekiston bozori (2026)

> Maqsad: dunyo va O'zbekiston universitetlarining raqamli tizimlari hali ham yecha olmagan
> muammolarni ilmiy manbalar asosida aniqlash va FBSU LMS uchun yo'nalish belgilash.

---

## 1-QISM. GLOBAL MUAMMOLAR (dunyo miqyosida yechilmagan)

### 1.1. Integratsiya va ma'lumot bo'laklanishi (eng katta tizimli muammo)

- Universitetlar 10-50 xil SaaS dasturdan foydalanadi (LMS, SIS, baholash, kutubxona,
  moliya) va ular **bir-biri bilan gaplashmaydi** — ma'lumotlar Excel orqali qo'lda
  ko'chiriladi, xatolar ko'payadi.
  *(Manba: "Integrating SaaS Products in Higher Education", RSIS 2025)*
- Yevropa universitetlari ittifoqi (Unite!) LMS'larni **LTI standarti** orqali ulashga
  harakat qildi — natija: "integratsiya oddiy ish emas, texnika, administratsiya va
  xavfsizlikka ta'sir qiladi" (2025).
- Hanseatic League tadqiqoti 7 ta universitet ma'lumot arxitekturasini tahlil qilib
  **5 ta tizimli bo'shliq** topdi:
  1. mos kelmaydigan ma'lumot formatlari;
  2. kurs-dastur-universitet darajalari orasidagi bog'lanish yo'qligi;
  3. real-vaqt sinxronizatsiya yo'qligi;
  4. self-service API va kataloglar yo'qligi;
  5. nozik darajadagi (row/column) xavfsizlik va GDPR-o'chirish yo'qligi.
- Xulosa: **"yaxlit ma'lumot ekotizimi" hali dunyoda ham yechilmagan**.

### 1.2. AI bilan akademik halollik inqirozi (2024-2026 da avj oldi)

- AI-detektorlar **ishonchsiz**:
  - 7 detektor TOEFL insho yozgan chet tilli talabalarning **61% ini "AI" deb noto'g'ri
    belgiladi** (Stanford, Liang va boshq.).
  - Bitta insho 5 xil detektorda "0% inson" dan "Human Generated" gacha baho oldi.
  - "Humanizer" dasturlardan keyin AI-matnning **96%+ aniqlanmay qoldi** (arXiv 2026).
- Natijada universitetlar detektorlardan **voz kechmoqda**: Vanderbilt (2023), Curtin,
  Waterloo, Cape Town, NTU (2027), SUSS (2026)... Nyu-York sudi detektorga asoslangan
  ayblovni **bekor qildi** (2026).
- Hozircha yagona yechim sifatida "process evidence" (qoralama tarixi, og'zaki so'rov,
  xavfsiz sharoitdagi nazorat ishlari) taklif qilinmoqda — lekin bu **qimmat va hali
  ommaviy emas**. Loyihalab bo'lmaydigan bo'shliq: **baholashni AI-davrida qayta qurish**.

### 1.3. Davomat aldash: "proxy" va "kirdi-chiqdi ketdi" muammosi

- QR-kodlar **94% hollarda** do'stlarga ulashilishi kuzatilgan (B.A.S.I.R. so'rovi,
  250 respondent, 2026) — skrinshot olib yuborish kifoya.
- **"Sign-and-leave"** (belgilanib, darsdan chiqib ketish) — deyarli barcha tizimlar
  buni umuman sezmaydi (bitta nuqtada belgilash).
- O'zbekiston misolida **EduTrack (Inha University in Tashkent, 2026)**:
  - bitta darsda davomatga **6.8 daqiqa** sarflanadi;
  - 4 ta nuqtali tekshiruv (checkpoint) sign-and-leave holatlarini **93% kamaytirdi**;
  - asosiy to'siq — **maxfiylik xavotirlari** (talabalar 3.9/5, o'qituvchilar 4.3/5);
  - Markaziy Osiyo yuzlari bo'yicha o'qitilgan modellar kam — demografik bias xavfi.
- Biometrik tizimlar **o'zi yetarli emas**: 600 respondentli tadqiqot (Springer, 2026)
  biometrik va an'anaviy tizimlar orasida sezilarli farq topmadi — sabab: infratuzilma,
  qurilmalar nosozligi va **tizimga majburiy rioya qilinmasligi**.

### 1.4. Learning Analytics: pilotdan ommaga chiqmayapti

- Universitetlarda learning analytics **pilot loyihalarda qolib ketmoqda** — sabab:
  ma'lumot tayyorlashga ketadigan vaqt va integratsiya bo'shliqlari (HE 2025).

### 1.5. Baholash muammolari (baholash validligi, inflatsiya, "raqamli charchoq")

- Baholash ko'p joyda **kompetensiyani emas, xotirani** o'lchaydi.
- **Baholash inflatsiyasi**: HEMIS'dagi yuqori GPA bilan real tayyorgarlik o'rtasida
  uzilish (aspec.uz, 2026).
- O'qituvchi bir semestrda yuzlab ishni tekshiradi → "raqamli charchoq", baholash
  avtomatik tus oladi, **feedback yo'qoladi**.

### 1.6. Boshqa global muammolar

- **Retention/dropout**: talabani tashlab ketishini oldindan aytish tizimlari hali
  "early alert" darajasida (Campbell & Nutt).
- **Maxfiylik/tartibga solish**: FERPA/GDPR muvofiqligi SaaS'larda murakkab, javobgarlik
  tarqoq.
- **Rivojlanayotgan davlatlarda offline/infratuzilma**: elektr va internet uzilishi
  tizimlarni ishdan chiqaradi (Nigeriya SOA tadqiqoti, 2025) — **offline-first** dizayn
  talab.

---

## 2-QISM. O'ZBEKISTON BOZORI (asosiy fokus)

### 2.1. HEMIS: monopoliya va uning muammolari

- HEMIS **majburiy** (VMQ-610), 2022-yildan barcha OTMlar faqat shu tizimda yuritadi;
  litsenziya ham tizimga bog'langan.
- Muammolar (manbalar: uz.wikipedia, ilmiy maqolalar, ORIENS jurnali 2023):
  1. **Infratuzilma**: past internet tezligi, server quvvati yetishmasligi, katta
     yuklamada sekinlashuv;
  2. **Kadrlar**: pedagoglarning raqamli ko'nikmalari past (57% LMS'dan foydalanishga
     tayyor emas — 2025 tadqiqoti);
  3. **Xavfsizlik**: universitetlarning ichki bazalarini HEMIS'ga ulashda xavfsizlik
     tahdidi; tavsiya — faqat read-only replication orqali (UrDU tadqiqoti, 2025);
     axborot xavfsizligi muammolari 62% da qayd etilgan — ISO 27001/GDPR darajasida
     emas;
  4. **Dizayn falsafasi**: tizim asosan **davlat nazorati uchun** qurilgan — xalqaro
     tajribada (Buyuk Britaniya) 50+ dastur raqobatlashadi, O'zbekistonda tanlov yo'q
     (ORIENS, 2023);
  5. **Ota-onalar ishtiroki yo'q** — xalqaro tizimlarda ota-ona portali standart;
  6. **Raqamli kontent**: SCORM/xAPI standartidagi materiallar kam, mobil
     optimallashtirilmagan (48% talaba shikoyati).

### 2.2. Kredit-modul tizimi: qog'ozda bor, amalda muammo

- 824-son qaror (31.12.2020) bilan ECTS joriy etildi; 30 kredit/semestr, 60/yil.
- Amaliyotdagi muammolar (Mustafaev ORIENS 2022; aspec.uz 2026):
  - o'qituvchilar mustaqil ta'lim topshiriqlarini **formal ravishda** baholaydi;
  - baholash mezonlari (5-ball / 100-ball / kredit) chalkash — huquqiy nizom yo'q;
  - talaba bilimini baholashda sub'ektiv omillar kuchli.

### 2.3. Davomat nazorati: eng zaif halqa

- Ko'p OTMlarda davomat hali **qog'oz/QR proksi** darajasida; HEMIS'da davomat real
  vaqtda emas, keyin kiritiladi.
- Yuqoridagi EduTrack tadqiqoti **aynan Toshkentda** o'tkazilgan va bu bo'shliqni
  tasdiqlagan: proxy sign-in va mid-lecture departure — hal qilinmagan.

### 2.4. Antiplagiat va AI

- HEMIS'ga Antiplag.uz integratsiyasi faqat **2026-yil aprelda** qo'shildi (v1.8.6).
- AI bilan yozilgan ishlarni aniqlash bo'yicha **milliy siyosat hali yo'q** — global
  detektor inqirozi O'zbekistonga ham tegishli.

### 2.5. Bozor imkoniyati

- HEMIS "yagona majburiy tizim" bo'lsa-da, u **universitet ichki jarayonlarini** to'liq
  qoplamaydi: real-time davomat, Face ID, aqlli approval oqimlari, monitoring, Face
  ID bilan aldashga qarshi nazorat, ota-ona portali, offline ishlash — bularning
  barchasi **bo'sh joy**.
- Xalqaro tadqiqotlar ko'rsatadiki, muvaffaqiyat **infratuzilma + majburlash +
  qulaylik** uchtasi birgalikda bo'lganda keladi — HEMIS'da qulaylik qismi zaif,
  bu yerda raqobat qilish mumkin (integratsiya orqali, monopoliya bilan urushmasdan).

---

## 3-QISM. FBSU LMS allaqachon yechgan muammolar

| Muammo | Global holat | FBSU LMS yechimi |
|---|---|---|
| Proxy davomat (QR ulashish) | 94% hollarda aldash mumkin | **Face ID + QR** (dinamik 10s token + yuz tasdiqlash) |
| Sign-and-leave | Deyarli hech kim sezmaydi | **Kirish + Chiqish QR**: 2-QR urilmasa "vaqtli tark etdi" |
| VPN/IP aldash | Ko'p tizimda yo'q | VPN/proxy, IP-geo moslik, IP-shared aniqlash |
| Davomat qo'lda yuritilishi | 6.8 daqiqa/dars | Real-time QR sessiya, avtomatik "kelmagan" belgilash |
| Natijalarni tasdiqlash | Yo'q | Sessiya finalizatsiyasi + "Istisno" bilan qayta ochish (saqlanadi) |
| Ko'p tilli muhit | Ko'p OTMda yo'q | To'liq **3 tilli** (uz/ru/en) |
| Baholash nazorati | Request-based | Baho o'zgarishi → **tasdiqlash oqimi** (request → registrar) |
| Real-time monitoring | Kechikadi | Rahbariyat paneli + at-risk talabalar (<80% davomat) |
| Rollar/vakolatlar | Tarqoq | 8 rol, vakolat bo'yicha scoped kirish |
| Ochiq API yo'qligi | Yopiq tizimlar | REST API + Webhook'ga tayyor |

---

## 4-QISM. HALI YECHILMAGAN IMKONIYATLAR (roadmap taklifi)

### 4.1. HEMIS ko'prigi (eng katta qiymat)
Read-only integratsiya modeli (UrDU tadqiqoti tavsiyasi): talabalar, baholar, davomatni
HEMIS formatiga **eksport/import qiluvchi ko'prik**. Universitetlar ikki tizimda ikki
marta ish qilishdan qutuladi — bu O'zbekiston bozoridagi eng katta og'riq.

### 4.2. AI-davr baholash modeli (global inqirozga javob)
- **Jarayon dalillari**: qoralama tarixi (draft versions), vaqt belgilari;
- **Og'zaki tekshiruv nuqtalari** (5 daqiqali himoya) — bahoning bir qismi;
- AI foydalanish **deklaratsiyasi** + savodxonlik moduli (University of Sydney modeli);
- Cross-lingual plagiat tekshiruvi (o'zbek↔ingliz).

### 4.3. "Mid-lecture checkpoint" (o'rta nazorat)
EduTrack tavsiyasi: dars o'rtasida 1-2 ta tasodifiy tekshiruv. Bizda kirish/chiqish bor —
o'rtasiga qo'shilsa sign-and-leave **93%+** qisqaradi (ilmiy tasdiqlangan).

### 4.4. Liveness (anti-spoofing) kuchaytirish
Hozir Face ID descriptor mosligi bor; qo'shish mumkin: **miltillash/bosh harakati**
(EAR usuli) — foto/video bilan aldashni yopadi.

### 4.5. Dropout early-warning
Davomat + GPA + topshiriq faolligi + chat ishtiroki asosida "xavf balli" —
hali dunyoda ham yaxshi yechilmagan, lekin bizda ma'lumot bor.

### 4.6. Offline-first PWA
Internet uzilganda QR/skaner/oddiy ishlar davom etadi, keyin sinxronlanadi — 
infratuzilma zaif hududlar uchun (Nigeriya modeli).

### 4.7. Ota-ona portali
Xalqaro standart, O'zbekistonda deyarli yo'q.

---

## 5. XULOSA

1. **Global**: eng katta yechilmagan muammolar — integratsiya, AI-davr baholash, davomat
   aldash, learning analytics ommalashuvi. Hech birida tayyor "kumush o'q" yo'q.
2. **O'zbekiston**: HEMIS kuchli, lekin universitet ichidagi real jarayonlar (davomat,
   aldashga qarshi nazorat, approval, monitoring, ota-onalar) qoplamagan — bu bo'shliq.
3. **FBSU LMS** aynan shu bo'shliqning katta qismini yopgan (Face ID, 2-QR, monitoring,
   approval, 3 til). Keyingi qadam: **HEMIS ko'prigi** — bu bozorda eng katta farq
   qiladigan imkoniyat.

---

## Manbalar

1. EduTrack: Checkpoint-based Face Recognition Attendance for Uzbek HE — Inha University
   in Tashkent, 2026.
2. B.A.S.I.R.: Combating proxy attendance (QR sharing 94%) — IIUM/UTHM, 2026.
3. The role of biometric systems in student attendance tracking — Springer Nature, 2026.
4. The pitfalls of AI detection in academic writing — AI and Ethics, Springer, 2026.
5. Why AI Detection Fails for Academic Integrity — arXiv 2608.11256, 2026.
6. AI Detectors Are Out, New Assessments Are In — Inside Higher Ed, 2026.
7. Student Cheating Is Becoming Impossible to Detect in an A.I. Era — NYT, 2026.
8. Federated Virtual Learning Management in a European University Alliance (LTI) — 2025.
9. Integrating SaaS Products in Higher Education: Enterprise Architecture — RSIS, 2025.
10. Beyond Silos: Educational Data Architectures in HE — 2025.
11. Higher Education Needs Integration Innovation — LEAGUE.
12. Service-oriented architecture for EMIS in Nigerian universities — 2025.
13. HEMIS axborot tizimi — uz.wikipedia.org/wiki/HEMIS; hemis.uz; dgov.uz.
14. Universitet ma'lumotlar bazasini HEMIS bilan ulashda xavfsizlik muammolari — UrDU, 2025.
15. O'ZBEKISTON OLIY TA'LIM TIZIMINING RAQAMLI FUNDAMENTI – HEMIS — ORIENS, 2023.
16. Kredit-modul tizimi: muammolar va yechimlar — ORIENS, 2022; VMQ 824-son (31.12.2020).
17. Baholash amaliyotidagi muammolar — ACADEMIC SPECTRUM, 2026.
18. Oliy ta'limda raqamli texnologiyalar muammolari (infratuzilma 43%, xavfsizlik 62%) —
    2025.
19. HEMIS v1.8.6 (Antiplag.uz, AI chatbot) — oliygoh.uz / infoedu.uz, 2026.
