# HEMIS tadqiqoti — TTPU LMS uchun solishtirish

> Manba: 2 ta tadqiqot agenti (HEMIS + jahon tizimlari), 2026-10-07. Manbalar bilan.

## HEMIS nima?
O'zbekiston oliy ta'lim boshqaruvining **markazlashgan davlat tizimi**:
- ~207 OTM, ~1.6 mln talaba, ~122 ming professor-xodim ([dgov.uz](https://dgov.uz/en/solution/detail/50))
- Modullar: kontingent, o'quv jarayoni, davomat, baholar, to'lov-shartnoma, normativ hujjatlar, hisobotlar, onlayn xizmatlar
- Uch quyi tizim: MFB (ma'muriy), O'JB (o'quv), IFB (ilmiy)

## ⚠️ MUHIM: VM 403-son qarori (30.06.2025)
Nodavlat OTMs **o'z axborot tizimini HEMISga integratsiya qilishi SHART** ([lex.uz](https://lex.uz/uz/docs/-7609624)).
→ Ya'ni bizning tizim HEMIS bilan **eksport/import ko'prigi** orqali ishlashi kerak (yoki rasmiy API kalit olib to'g'ridan integratsiya).

**HEMIS API**: REST API bor, lekin **yopiq** — API kalit kerak (`student.hemis.uz/rest/docs` → 401). Uchinchi tomon kutubxonasi: [hemisapi](https://github.com/dasturchiuz/hemisapi).

## HEMIS hujjatlari (bizning Hujjatlar moduliga namuna):
| Hujjat | Bizda holat |
|---|---|
| Buyruqlar (qabul, ko'chirish, tiklash, chetlashtirish, stipendiya, jazo) | ✅ Document moduli (ORDER) qurilmoqda — shablonlar qo'shiladi |
| Vedomostlar / reyting varaqalari | ✅ Imtihon varaqalari bor |
| Transcript | ✅ Bor |
| Akademik ma'lumotnoma | ✅ Document (REFERENCE) + shablon |
| Diplom (QR-kodli, check-diplom) | ❌ Keyingi reja |
| Shartnoma/to'lov hujjatlari | ❌ Moliya moduli keyingi reja |

## Rollar (HEMISdan olingan signallar):
- Kadrlar bo'limi → xodimlar ro'yxati; Dekanat → talabalar ro'yxati
- Xizmatlar: rahbariyat, talabalar, o'qituvchilar, **ota-onalar**, davlat idoralari
- ⚠️ To'liq huquqlar matritsasi ochiq manbada yo'q (yopiq hujjatlarda)

## HEMIS zaif tomonlari (bizning imkoniyat):
- Internet sekinligida muammo, yuklamada sekinlashuv (Gazeta.uz/Vikipediya)
- Bizning afzallik: QR davomat, Face ID, real-time monitoring, zamonaviy UI

## 🎯 Bizning tizimga qo'shiladigan yo'nalishlar (HEMISdan o'rganib):
1. **Ota-onalar portali** — ota-ona farzandining davomati/bahosini ko'radi (HEMISda bor!)
2. **Shartnoma/to'lov (moliya) moduli** — kontrakt holati, qarzlar
3. **QR himoyalangan diplom** — bitiruv hujjati + tekshirish sahifasi
4. **Normativ buyruq shablonlari** — 6 ta rasmiy buyruq turi tayyor shablon bilan
5. **HEMIS eksport paketi** — kontingent/baholar/davomatni HEMIS formatiga (VM 403 talabi)
6. **Ilmiy faoliyat moduli** — IFB (keyingi bosqich)

## Xulosa
Bizning tizim hozircha HEMISdan **kuchli tomonlari**: davomat (QR+Face), UI/UX, real-time analitika, xodimlar moduli (farroshdan rektorgacha — HEMISda yo'q!).
**Orqada**: moliya, ota-onalar portali, diplom tizimi, rasmiy HEMIS integratsiya.

---

# Jahon tizimlari tadqiqoti (Moodle/Canvas/ERP/DMS)

## 1. LMS rahbarlari — bizga saboq
| Mezon | Moodle | Canvas | Blackboard | Biz |
|---|---|---|---|---|
| Litsenziya | Ochiq | Tijoriy SaaS | Tijoriy | O'zimizniki (to'liq nazorat) |
| Rollar | Granular + maxsus | Tayyor rollar | Qatlamli | 10 rol, scoped ✅ |
| Modullar | 1600+ plagin | SpeedGrader, Mastery | Analytics | Kontent+baho+QR+Face+HR ✅ |
| SIS integratsiya | Plagin | O'rnatilgan (Banner/PeopleSoft) | OneRoster | HEMIS ko'prigi (reja) |
**Saboq:** Moodle "granular ruxsatlar" modeli — bizning scoped rol tizimimiz shunga mos ✓

## 2. Universitet ERP — hujjat aylanmasi (bizning modul uchun dizayn tasdiqlandi!)
**Ellucian Banner Workflow:** jarayonlarni rollarga yo'naltiradi + **audit trail** yaratadi; Reports Management xatlar/buyruqlarni avtomatik generatsiya qiladi.
**PeopleSoft Approval Framework:** tranzaksiya → workflow → navbatdagi tasdiqlovchiga bildirishnoma (bosqichlar konfiguratsiya qilinadi).
**Universal hujjat modeli (3 manba kesishmasi):**

| Hujjat | Kim yaratadi | Kim imzolaydi | Raqamlash | Zanjir |
|---|---|---|---|---|
| **Buyruq** | Dekanat/bo'lim | **Rektor** (vakolatli prorektor) | Tur+yil+raqam (№12-K) | draft→review→signed→archived |
| **Xat** | Mas'ul xodim | Rahbar | Chiquvchi/kiruvchi registr | draft→review→sent→archived |
| **Ma'lumotnoma** | Dekanat/kadrlar | Bo'lim rahbari (muhr) | Yil+raqam | draft→issued→archived |
| **Bayonnoma** | Kotib | Rais+kotib | Majlis turi+raqam | draft→approved→signed→archived |

**→ Bizning Document moduli aynan shu model bo'yicha qurilmoqda! ✅** (kind: ORDER/LETTER/REFERENCE/PROTOCOL + status zanjiri + raqamlash + imzo)

## 3. Elektron imzo va arxiv (best practices)
- **eIDAS (YI)** — malakali elektron imzo qo'lyozma imzo bilan teng; muhr + **vaqt tamg'asi** qo'shiladi
- **O'zbekiston:** E-imzo/ERI tizimi mavjud (keyingi integratsiya imkoniyati)
- **ISO 15489** — saqlash muddatlari (retention), nomenklatura (jildlar klassifikatori)
- **Audit trail** — har amal arxivlanadi (bizda AuditLog bor ✓)

## 4. O'zbekiston OTM hujjat qoidalari
- **VM 393 (2017) + VM 578 (2025)**: qabul/ko'chirish/tiklash/chetlashtirish tartiblari
- **Buyruq turlari**: akademik ta'til (rektor buyrug'i, 1 hafta ichida), chetlash (8 asos: xohish, ko'chish, salomatlik, intizom, 74+ soat qoldirish, kontrakt qarzi, sud, qalbaki hujjat)
- **Ish yuritish**: ro'yxatga olish → ijro nazorati → tizimlashtirish → arxiv
