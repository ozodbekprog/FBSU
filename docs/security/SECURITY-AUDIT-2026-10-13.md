# Xavfsizlik auditi va hardening — 2026-10-13

**Repo:** FBSU LMS (`fbsu`) · **Branch:** `security/hardening` · **Stack:** Next.js 16.4, React 19, Prisma 6, PostgreSQL

## Metodika

- 6 ta parallel audit agenti: IDOR x3 (192 API route bo'lingan), XSS/injection/SSRF, CSRF/auth/session, dependencies.
- Har bir da'vo kodda qo'lda tekshirildi (false positive'lar chiqarib tashlandi).
- Tuzatishlardan so'ng mustaqil `code-verifier` agenti 10/10 bandni PASS deb tasdiqladi.
- Jonli dalillar: `tsc` 0 xato · `vitest` 346/346 · `next build` OK · prod smoke curl · Playwright 4/6.

## Tuzatilgan zaifliklar

| Sohа | Muammo | Tuzatish |
|---|---|---|
| CSRF | `CSRF_EXEMPT_API` `startsWith` — `/api/csrf-*`, `/api/health*` prefikslari gate'ni chetlab o'tardi | Aniq moslik (`pathname === prefix`) — `src/proxy.ts` |
| CSRF | Proxy matcher `.*\..*` — nuqtali istalgan `/api/...` yo'l proxy'ni butunlay chetlab o'tardi | Matcher: `/(api/.*\|(?!_next\|favicon.ico\|.*\..*).*)` — barcha `/api/` endi qamrovda |
| CSRF | 8 ta state-changing handler'da handler-daraja tekshiruv yo'q edi (attendance ×5, import, academic-calendar ×2) | `verifyCsrfFromRequest()` qo'shildi (proyektdagi barcha mutatsiya handler'lar endi qo'sh himoyalangan) |
| JWT | `jwtVerify` 4 nuqtada `algorithms` allowlist'siz (alg-confusion xavfi) | `{ algorithms: ["HS256"] }` — `proxy.ts` ×2, `auth.ts`, `csrf.ts` |
| JWT | Proxy'da bo'sh secret → bo'sh kalit bilan imzolangan tokenlar qabul qilinardi | Fail-closed: secret bo'lmasa CSRF rad etiladi, sessiya yaroqsiz |
| IDOR | `transcript` — har qanday non-STUDENT rol egasi o'quv kursiga "teacher" bo'lib qolsa boshqa talaba transcriptini ola olardi | Rol gate: faqat ADMIN/TEACHER/DEKAN/KAFEDRA_MUDIRI (+kurs egalik tekshiruvi saqlangan) |
| Authz | `academic-calendar` — har qanday TEACHER universitet tadbirini tahrir/o'chira olardi | PATCH/DELETE/POST faqat ADMIN; UI ham `canManage = ADMIN` |
| XSS | OpenBoard text/heading bloklari regex "sanitizer" bilan tozalanardi (evaziga oson aylanib o'tiladi) | `isomorphic-dompurify` (ALLOWED_TAGS/ATTR whitelist) — client + **server** (PUT saqlashda) |
| XSS | KaTeX `trust` sozlamasi noaniq — `\html`/`\href` xavfi (chuqur himoya) | `trust: false` + KaTeX chiqishi DOMPurify'dan o'tadi |
| XSS | `code-runner` postMessage'ni istalgan oynadan qabul qilardi | `event.source === iframe.contentWindow` tekshiruvi |
| Auth | `bcrypt` cost 10 (9 joyda) | Cost 12 (mavjud hash'lar ishlashda davom etadi) |
| Auth | Admissions: barcha yangi talabalarga hardcoded `ttpu1234` parol | `crypto.randomBytes` random temp parol; javobda **bir marta** qaytariladi + `Cache-Control: no-store` |
| Sizib chiqish | Import javobida generatsiya qilingan parollar keshlanishi mumkin | `Cache-Control: no-store` |
| Bonus (prod bug) | OpenBoard "Run" prodda umuman ishlamasdi: sandbox iframe'dagi `eval()` prod CSP (`unsafe-eval` yo'q) tomonidan bloklanardi | `eval` butunlay olib tashlandi — kod to'g'ridan-to'g'ri script sifatida (escaping bilan) bajariladi; prod E2E yashil |

## Dependency yangilash (xavfsizlik uchun)

| Paket | Oldin | Keyin | Sabab |
|---|---|---|---|
| next | 16.3.6 | **16.4.0** | cache poisoning/leak (high ×5) |
| vitest / @vitest/coverage-v8 | 3.2.7 | **5.0.4** | critical RCE + path traversal (npm 10.9.8 arborist bug'i sababli 4.1.11 o'rnatilmadi) |
| katex | 0.16.47 | **0.19.0** | low advisory; 0.18.11 deprecatsiya qilingan |
| @types/node | ^20 | ^22 | runtime (Node 22) mosligi |
| eslint-config-next | 16.3.5 | 16.4.0 | next bilan lockstep |
| isomorphic-dompurify | — | qo'shildi | XSS sanitizatsiya |
| @tensorflow/tfjs | ^4.22.0 | **olib tashlandi** | hech qayerda ishlatilmaydi (grep bilan tasdiqlandi) |
| overrides | — | lodash-es 4.18.1, deepmerge-ts 8.0.2, sass 1.105.1, sharp 0.35.5, source-map-js 1.2.2, argparse 2.0.1, nanoid 3.3.20/5.1.16, mermaid→katex 0.19.0 | transitive zaifliklar |

**`npm audit`: 31 (2 critical, 16 high) → 5 (hammasi dev-only, upstream fix yo'q).** Qolgan 5 ta — `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` zanjiri: npm'ning taklif qilgan "yechimi" eslint-config-next'ni 14.x ga tushirish (qabul qilinmadi). Build/lint vaqtida ishlaydi, prodga chiqmaydi.

## Tekshiruv dalillari

- `npx tsc --noEmit` — 0 xato; `npm run build` — muvaffaqiyatli.
- `vitest run` — **346/346 pass** (vitest 5 mosligi: `clearMocks: false` + constructor-capable mock tuzatildi).
- `eslint` — 2 xato faqat WIP `secure-exam` modulida (bu o'zgarishlarga aloqasiz, avvaldan).
- Prod smoke (port 3111, `next start`): `POST /api/csrf-evil` → 403 (avval bypass), `POST /api/foo.bar` → 403 (avval proxy'dan tashqarida), CSRF'siz login → 403, CSRF bilan → 200; xavfsizlik sarlavhalari (CSP/HSTS/XFO/nosniff/Vary) joyida; `/api/health` exempt ishlaydi.
- Playwright: auth, public, openboard, teacher — **yashil**. admin/student — avvaldan mavjud test-draj: (a) student.spec "Programming Fundamentals (PROG)" kutadi, DB'da kurs "Dasturlash asoslari"; (b) admin.spec 6 switch kutadi, WIP secure-exam moduli 7-chi switch'ni qo'shgan. Kodga aloqasi yo'q.

## Tekshiruvda "false positive" deb rad etilganlar

- `profile/cover` — auth bor (`image-upload.ts:40`), fayl `user.id`ga scope qilingan.
- `openboard` — board `userId: user.id` bilan scope; CSRF + zod bor.
- `/api/badges/[id]` — ochiq OpenBadges verifikatsiya (dizayn bo'yicha, faqat imzolangan badge).
- Login/reset-password rate-limit — mavjud (10/10min va 5/15min).
- API sarlavhalari — `next.config.ts` `/:path*` orqali barcha javoblarga qo'llanadi (jonli tekshirildi).
- Finance payments/contracts GET — university-darajali rollar (ADMIN/REGISTRAR/REKTOR/PRO_RECTOR) uchun dizayn; o'zgartirilmadi.

## Qasddan o'zgartirilmagan (qabul qilingan / tavsiya)

- `sameSite: "lax"` — CSRF double-submit bilan standart himoya; `strict` tashqi havolalardan kirishda UX buzadi. Xavf qabul qilindi.
- Secure-exam WIP moduli (`sync` event allowlist, screens soni klientga ishonch) — **boshqa branchda davom etayotgan ish**, bu branch'da o'zgartirilmadi (konflikt oldini olish). Integratsiyadan oldin tuzatilsin.
- Attendance QR token rate-limit 150/min (teacher, autentifikatsiya) — qoldirildi.
- `admin/backup` eksport — ADMIN-only + audit log; qo'shimcha re-auth tavsiya etiladi.
- Diploma raqamlari ketma-ket (`DIP-{year}-{n}`) — verifyCode random; enumeratsiyaga qarshi rate-limit tavsiya.
- Login sahifadagi demo parollar (chip) — demo maqsadida, o'zgartirilmadi.
- WIP modules: lint'dagi 2 xato `secure-exam/run-room.tsx`da — keyingi secure-exam ishida tuzatilsin.

## Fayl o'zgarishlari (asosiy)

`src/proxy.ts` · `src/lib/auth.ts` · `src/lib/csrf.ts` · `src/lib/openboard/{sanitize,code-runner}.ts` · `src/components/openboard/blocks/formula-block.tsx` · `src/app/api/{openboard,board,profile,transcript,auth/register,auth/reset-password,admin/import,admin/users,admin/users/[id],admissions/[id],academic-calendar,academic-calendar/[id],attendance/**}/route.ts` · `src/app/(app)/calendar/page.tsx` · `src/server/generator.ts` · `package.json` · `package-lock.json` · `vitest.config.ts` · `src/lib/rate-limit.test.ts`
