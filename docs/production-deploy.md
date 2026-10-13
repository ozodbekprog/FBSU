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
