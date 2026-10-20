# Production deploy (Vercel)

Global sayt: **https://fbsu.vercel.app** (Vercel + Neon Postgres). Kod GitHub'dan avtomatik deploy qilinadi (git integration).

## Nima o'zgardi

- `package.json` ga `"vercel-build": "node scripts/vercel-build.mjs"` skripti qo'shildi. Vercel default build command o'rniga shu skriptni ishlatadi.
- Yangi fayl: `scripts/vercel-build.mjs` — `prisma generate` → `prisma migrate deploy` → `next build`.
- `"build"` skripti **o'zgartirilmadi**: GitHub CI (`npm run build`) u soxta `DATABASE_URL` bilan ishlaydi, shuning uchun CI ga migratsiya qo'shilmadi.
- `.github/workflows/vercel-deploy.yml` dagi `VERCEL_TOKEN` secreti bekor qilingan (oxirgi 30+ push'da `vercel pull` doimiy fail edi), shuning uchun u workflow endi ishonchli emas — migratsiya endi build ichida yuguradi.

## Keyingi deploy'da nima bo'ladi

1. Vercel `vercel-build` ni ishga tushiradi.
2. `prisma migrate deploy` barcha bajarilmagan migratsiyalar (jumladan `20261013120000_chat_delete_for_me`) ni production DB ga qo'llaydi — `ConversationSetting` jadvaliga `deletedAt` ustuni qo'shiladi.
3. `next build` yangi kodni yig'adi.
4. Chat API'lar (`/api/chat/conversations/**`) qayta ishlay boshlaydi.

Migratsiya uchun `DATABASE_URL` qiymati `DATABASE_URL_UNPOOLED` dan olinadi (Neon pooler orqali ulanish migratsiyani qo'llab-quvvatlamaydi). `DATABASE_URL_UNPOOLED` bo'lmasa `DATABASE_URL` ishlatiladi.

## Agar build migratsiya xatosi bilan to'xtasa

Migratsiya xatosi build'ni to'xtatmaydi: `[vercel-build]` ogohlantirish chiqaradi, `next build` davom etadi (sayt yangi kod bilan chiqadi, lekin DB sxemasi eskirgan bo'lib qoladi). Migratsiyani alohida qo'lda qo'llash kerak:

- Vercel build log'idagi `[vercel-build]` va Prisma xatolarini o'qing (qaysi migratsiya, qanday xato).
- Migratsiya holatini tekshirish:

```bash
DATABASE_URL=<to'g'ridan-to'g'ri ulanish URL> npx prisma migrate status
```

- Qo'lda qo'llash:

```bash
DATABASE_URL=<to'g'ridan-to'g'ri ulanish URL> npx prisma migrate deploy
```

- Agar xato `P1001`/timeout bo'lsa — DB to'g'ri ishlamayapti yoki URL noto'g'ri. Vercel'da `DATABASE_URL_UNPOOLED` ni tekshiring (Settings → Environment Variables).
- Migratsiyani build ichida butunlay o'tkazib yuborish kerak bo'lsa: `SKIP_MIGRATE=1` environment variable'ini qo'ying.

## Deploy umuman ishlamayapti bo'lsa

Repo'dagi `.github/workflows/vercel-deploy.yml` `VERCEL_TOKEN` secreti bekor bo'lgani uchun fail qiladi (`vercel pull` → "token is not valid"). Bu workflow'ni yoqish uchun:

1. `fbsu.vercel.app` ni xizmat qilayotgan Vercel akkauntidan yangi token yarating (Settings → Tokens).
2. Repo's GitHub secret'larida `VERCEL_TOKEN` ni yangilang (token egalari `ozodbekprog/FBSU` repo adminsi bo'lishi kerak).

Token yangilangan bo'lsa, workflow migratsiyani ham, deploy'ni ham o'zi qiladi va `vercel-build`ga zarurat qolmaydi.

## EduPage jadvalini soatlik avtomatik yangilash

`.github/workflows/edupage-sync.yml` har soatda (UTC `:07` da) `GET /api/edupage/sync`
ni chaqiradi. Qo'shimcha ravishda `Jadval` sahifasi ochilganda ma'lumot 30 daqiqadan
eski bo'lsa fonda sinxronlanadi. Ikki sinxron bir vaqtda ishga tushsa, DB'dagi
`edupage:sync-lock` qulfi ikkinchisini 409 bilan qaytaradi.

Sozlash (bir marta):

1. Vercel'da `EDUPAGE_SYNC_SECRET` (yoki mavjud `CRON_SECRET`) environment variable
   qo'shing — uzun tasodifiy satr.
2. GitHub repo'da bir xil qiymatni secret sifatida qo'shing:

```bash
gh secret set EDUPAGE_SYNC_SECRET -R ozodbekprog/FBSU
```

3. Agar sayt `fbsu.vercel.app` bo'lmasa, repo variable qo'shing:

```bash
gh variable set APP_URL -R ozodbekprog/FBSU --body https://fbsu.vercel.app
```

4. Qo'lda sinab ko'rish:

```bash
gh workflow run edupage-sync.yml -R ozodbekprog/FBSU
```

Workflow faqat default branch'dan (odatda `main`) jadval bo'yicha ishlaydi, shuning
uchun merge qilingandan keyin faollashadi. Vercel Pro bo'lsa, GitHub Actions o'rniga
`vercel.json` dagi cron'dan ham foydalanish mumkin:

```json
{ "crons": [{ "path": "/api/edupage/sync", "schedule": "0 * * * *" }] }
```

Vercel cron so'roviga `Authorization: Bearer $CRON_SECRET` avtomatik qo'shiladi.
