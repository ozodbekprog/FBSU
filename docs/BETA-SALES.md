# FBSU Beta — sotuv paketi

## Beta havola

- Production: https://fbsu.vercel.app
- Login: https://fbsu.vercel.app/login
- Preview: https://fbsu-er8ovjjla-ozodbekprog.vercel.app (eski preview; production yangiroq)

## Demo hisoblar

Barcha demo hisoblar paroli: `ttpu1234`

| Rol | Email | Nima ko'rsatiladi |
| --- | --- | --- |
| Talaba | `ozodbek@ttpu.uz` | Yangi dashboard, kurslar, jadval, baholar, GPA, davomat, imtihonlar |
| O'qituvchi | `t.prog@ttpu.uz` | O'qituvchi dashboardi, kurslar, jurnal, davomat, hisobotlar |
| Admin | `admin@ttpu.uz` | Admin panel, foydalanuvchilar, guruhlar, monitoring, moliya |

Login sahifasida “Asosiy rollar” bo‘limidagi kartani bosish demo hisobga bir klikda kiradi.
Boshqa rollar: rektor, prorektor, dekan, kafedra mudiri, o‘quv bo‘limi, buxgalter, tyutor, xodim, ota-ona.

## 10 daqiqali demo stsenariy

1. **Talaba** (`ozodbek@ttpu.uz`)
   - Dashboard: GPA, davomat, topshiriqlar, kreditlar
   - “Baholar dinamikasi”: 4 chiziqli grafik va hover
   - QR davomat kartasi
   - Bugungi jadval, kurslar davomati, yaqin muddatlar
   - Kurslar → kurs kartasi → materiallar
   - Imtihonlar → test kartasi → savollar/natijalar
   - Mobil ko‘rinish: oynani 390px ga toraytirish

2. **O‘qituvchi** (`t.prog@ttpu.uz`)
   - Dashboard: yuklama, kurslar, yaqin darslar
   - Jurnal: guruh/kurs bo‘yicha baholar
   - Davomat: darsni belgilash
   - Hisobotlar: kurs bo‘yicha CSV eksport

3. **Admin** (`admin@ttpu.uz`)
   - Admin panel: foydalanuvchilar, kurslar, guruhlar statistikasi
   - Foydalanuvchilar: qidiruv, filtr, tahrirlash, parol reset
   - Monitoring va moliya bo‘limlari
   - Imtihonlar ro‘yxati

## Beta’da tayyor

- Student, teacher va admin panellari
- Yangi vizual tizim: solid yuzalar, glass/blur yo‘q, silliq animatsiyalar
- Mobil/planshet: 1024px gacha drawer + pastki tab bar
- Imtihonlar: faol enrollment filtri, muddati o‘tgan testlarda “Boshlash” yopilgan
- Kurslar, jadval, baholar, GPA, davomat, moliya, xabarlar
- QR/Face ID davomat, EduPage jadval sinxroni, AI yordamchi
- Bir klikli demo kirish

## Ma’lum cheklovlar

- HEMIS import/eksport ko‘prigi hali to‘liq emas.
- Tizim bitta universitet uchun; multi-tenant/billing/self-onboarding yo‘q.
- Productionda PII shifrlash kaliti yo‘q — shifrlash o‘chiq.
- Avtomatik backup/restore drill, monitoring/SLA va tashqi security audit hali yo‘q.
- Deploy qo‘lda (Vercel CLI); Git auto-deploy yoqilmagan.
- Production demo bazasida hozircha barcha testlar muddati o‘tgan; faol test yaratilsa “Boshlash” ko‘rinadi.

## Keyingi qadamlar

1. HEMIS bridge (birinchi shartnoma uchun kritik).
2. Backup/monitoring/PII encryption/security review.
3. Moodle/Excel migratsiya kiti.
4. Admin/teacher/student qo‘llanmalari va support SLA.
5. Narx/paket: yillik litsenziya + joriy etish + support.
