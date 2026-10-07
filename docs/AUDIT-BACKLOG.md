# TTPU LMS — AUDIT BACKLOG (to'xtovsiz rivojlantirish)

> 6 ta parallel agent auditi asosida (2026-10-07): tezlik/baza, o'quv jarayoni, davomat/Face ID/turniket, boshqaruv/rollar, infratuzilma, UI/UX.
> Har to'lqin: tuzatish → test → deploy. Status: [x] bajarildi, [ ] navbatda.

## ✅ TO'LQIN 1 — BAJARILDI (deploy mmb0gwdsf)
- [x] 13 ta yangi DB indeks (QuizAttempt, Submission, Enrollment, Attendance, Notification, Certificate, GradeChangeRequest, User)
- [x] auto-close: batch guruhlash + updateMany (N+1 yo'q)
- [x] Turniket skaner faqat ADMIN/REGISTRAR/XODIM (talaba skanlay olmaydi)
- [x] Transcript jadvali mobil scroll
- [x] 187 unit test

## 🔴 TO'LQIN 2 — YUQORI (navbatda)

### O'quv jarayoni
- [ ] `transcript/page.tsx` — TEACHER faqat o'z kurslarini ko'rsin (API bilan mos)
- [ ] Yagona baholash dvigateli: quiz "eng yaxshi urinish" siyosati (grades/gpa/transcript/report bir xil hisoblasin)
- [ ] Quiz `dueAt` + attendance eligibility serverda majburiy (UI va'dasiga mos)
- [ ] Sana siyosati: Asia/Tashkent (+5) — `datetime-local`, `startOfToday`, `todayIso` hammasi bitta helper
- [ ] Transcript: EXCUSED/SUSPICIOUS qatnashmagan hisoblansin (`attendanceCounts`)
- [ ] Enrollment `ACTIVE` filtri qolgan joylar: report-data, transcript-data, exams session-data, gpa, courses API
- [ ] Quiz shuffle va baholash remap mosligi (hozir aralashtirish bahoga ta'sir qilmaydi)

### Davomat / Face ID / Turniket
- [ ] Face policy qarori (Tony): yuzsiz check-in → FACE_NOT_ENROLLED signal; yuzni o'chirib bypass qilishni to'sish
- [ ] `faceCheck ok` bo'lganda IP flaglarni O'CHIRMASLIK (auditga yuborish)
- [ ] QR `jti` bir martalik (replay himoyasi) + grace qisqartirish
- [ ] LEFT_EARLY: keyingi CHECK_OUT bilan PRESENT/LATE ga tiklash
- [ ] `SessionPresent` o'qituvchi lokatsiyasini token so'rovida yuborsin (GEO_FAR ishlashi uchun)
- [ ] Journal UI va server hisobini bitta helperga birlashtirish
- [ ] `access/scan` rate-limit + anti-passback (ketma-ket IN-IN)

### Infratuzilma
- [ ] Rate-limit 9 ta endpointga: scan, upload, search, sessions, token, report/send, tasks, staff-attendance, reviews
- [ ] `withRouteErrors` wrapper — 108 route'da try/catch (strukturaviy 500)
- [ ] XFF: faqat ishonchli hop (x-real-ip) yoki TRUSTED_PROXY flag
- [ ] Rate-limit Redis'siz: fail-safe try/catch + ogohlantirish
- [ ] APP_URL va SMTP sozlash (infra/Tony)

### Boshqaruv / Rollar
- [ ] Hisobot eksport 403 muammosi (rahbariyat scope bilan ruxsat yoki tugmani yashirish)
- [ ] Orders (transcript/certificate/retake arizalari) → REGISTRATOR
- [ ] Kurator tayinlash UI: TYUTOR qo'shish + `isActive` tekshiruvi (subgroups teachers ro'yxati)
- [ ] Staff overview `notCame` hisobi xatosi (ADMIN hisobga mosligi)

### UI/UX
- [ ] 7 sahifa i18n: quizzes (4 sahifa), bonus-points, users/[id] — hardcode o'zbekcha → t()
- [ ] `/schedule` mobilda default "list" ko'rinish
- [ ] 44px touch targets (sm tugmalar, oy strelkalari, til almashtirish)
- [ ] Label htmlFor binding + xato bloklarida `role="alert"`

### Tezlik
- [ ] `/monitoring` — attendance `groupBy` aggregatsiya (xotiraga hammasini olmaslik)
- [ ] `/admin/users` — pagination (take/skip + count)
- [ ] `/dashboard` (talaba) — Promise.all; teacher darslar DB filtri
- [ ] `curator/data.ts` — sana oynasi + groupBy
- [ ] `admin/charts/data.ts` — select optimizatsiya (answers/options olib tashlash)
- [ ] `chat/unread` — conversationId prefetch + count

## 🟠 TO'LQIN 3 — O'RTA (qolganlar)
- [ ] Quiz session finalizatsiya: parallel sessiya race (partial unique index)
- [ ] Submission TOCTOU: baholangan javobni qayta topshirishda baho yo'qolishi
- [ ] GRADED dan keyin quiz/savol tahriri natijalarni o'zgartiradi (maxScore snapshot)
- [ ] `maxScore` ni pasaytirish tekshiruvi
- [ ] Sertifikat sahifasi: faqat kurs egasi/admin ko'rsin; berishda ACTIVE + yakun sharti
- [ ] Oral defense: DONE da o'lik tugma + `scheduledAt` UI da; bildirishnomalar (notifyUser)
- [ ] Test parallel start `maxAttempts` bypass (advisory lock)
- [ ] Assignments: topshirmaganlar ro'yxati, bulk baholash, per-student deadline
- [ ] Kurs/o'quv materiallar qattiq o'chirish → soft-delete/arxiv
- [ ] Staff attendance: Toshkent sanasi + kampus tekshiruvi (turniket bilan bog'lash)
- [ ] QR lokatsiyani DBga (restart'da geo yo'qolmasligi)
- [ ] ip-api fail-open → IP_GEO_UNAVAILABLE signal
- [ ] NAT/IP_SHARED yolg'on pozitivlar (kampus WiFi)
- [ ] Staff-attendance overview scope (dekan/kafedra)
- [ ] Monitoring/reporting CSV eksportlar
- [ ] Bulk amallar: users faollashtirish/bloklash, staff eksport

## ⚪ TO'LQIN 4 — PAST / SAYQAL
- [ ] Global-error.tsx + (auth) error.tsx
- [ ] instrumentation.ts + error tracking
- [ ] Notification empty state → EmptyState; 404 brend ranglari
- [ ] Chat 100dvh; schedule builder toast aria
- [ ] EN/RU kataloglardagi mavjud 1-2 o'zbekcha hint
- [ ] uploads: metadata + egalik (qisman bajarilgan; xom fayllar uchun qolgan)
- [ ] `access/logs` stats groupBy; search pg_trgm (kelajakda)
- [ ] Skip-to-content ilovada
- [ ] Confirm dialog yagonaligi

## 🤝 TONY QARORI KERAK
- Face ID siyosati: majburiymi yoki ixtiyoriymi? (hozir ixtiyoriy — o'chirib bypass mumkin)
- APP_URL (domen) — Vercel'da
- SMTP (email) sozlash — xat yuborish uchun
- Redis (rate-limit mustahkamlash) — infratuzilma
- Telegram bot tokeni
