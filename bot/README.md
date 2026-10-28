# FBSU Telegram bot

Mustaqil Node skript: long polling, tashqi kutubxonasiz (Node `fetch` + loyihadagi Prisma).

## Mini ilova (Telegram Web App)

Sayt Telegram ichida mini ilova sifatida **@ttpu_uz_bot** orqali ochiladi
(OWNER bot — `@fbsu_owner_bot` — faqat owner vazifalari uchun qoladi).

- Bot menyusidagi **FBSU** tugmasi va `/app` buyrug'i mini ilovani ochadi.
- Telegram ichida ilova birinchi marta email/parol bilan kiriladi. Shundan keyin
  Telegram hisobi akkauntga bog'lanadi (`User.telegramId`) va keyingi ochilishlarda
  avtomatik kiriladi.
- `initData` serverda mini ilova botining tokeni bilan HMAC orqali tekshiriladi
  (`src/server/telegram-init-data.ts`, `POST /api/auth/telegram`), 24 soatdan eski
  ma'lumot qabul qilinmaydi.
- Manzil `FBSU_APP_URL` bilan beriladi (standart: `https://fbsu.vercel.app`).

Bir marta sozlash (menyu tugmasi, nom, tavsif va buyruqlar):

```bash
TELEGRAM_MINIAPP_BOT_TOKEN="<@ttpu_uz_bot tokeni>" node bot/setup-miniapp.mjs
TELEGRAM_MINIAPP_BOT_TOKEN="..." node bot/setup-miniapp.mjs --check
```

Standart holatda faqat menyu tugmasi va buyruqlar yangilanadi — bot nomi va
tavsifi tegilmaydi. Ular ham kerak bo'lsa `--profile` qo'shing.

## 1. Bot token olish

1. Telegramda **@BotFather** ga yozing.
2. `/newbot` → bot nomi va username kiriting.
3. BotFather bergan tokenni oling (`123456789:AA...` ko'rinishida).

## 2. Tokenni sozlash

Loyiha ildizidagi `.env` fayliga qo'shing:

```
TELEGRAM_BOT_TOKEN="<tokeningiz>"
```

Yoki har safar qo'lda bering (pastga qarang).

## 3. Ishga tushirish

Loyiha ildizidan:

```bash
node bot/telegram.mjs
```

Tokenni to'g'ridan-to'g'ri berib:

```bash
TELEGRAM_BOT_TOKEN="<tokeningiz>" node bot/telegram.mjs
```

To'xtatish: `Ctrl+C`. Bot long polling bilan ishlaydi, server (Next.js) ishlashi shart emas —
faqat `.env` dagi `DATABASE_URL` manzilida PostgreSQL ishlab turishi kerak.

## Buyruqlar

- `/start` — salomlashish va imkoniyatlar ro'yxati
- `/app` — FBSU mini ilovasini ochish tugmasi
- Saytda (Sozlamalar → Aloqa) olingan 6 xonali kodni yuborish — chatni foydalanuvchiga bog'laydi.
  Kod 10 daqiqa amal qiladi va bir marta ishlatiladi
- `/jadval` — bugungi darslar: `📅` sarlavha, kun nomi va sana, har dars
  `🕘 vaqt | 📚 fan | 🚪 xona | 👨‍🏫 o'qituvchi` ko'rinishida, darslar orasida bo'sh qator
- `/ertaga` — ertangi darslar (xuddi shu ko'rinishda)
- `/hafta` — haftalik jadval: `📌 Dushanba` kabi kun sarlavhalari, ajratgichlar,
  bugungi kun belgilanadi, har bir darsda holat (masalan `❌ Bekor qilindi`)
- `/davomat` — o'qituvchi uchun `🔔` uslubidagi bugungi darslar (par vaqti, fan, xona, guruh)
  va har bir dars uchun `🔗` davomat sahifasi havolasi. Talaba yuborsa, bugungi jadvali qaytadi.
- `/imtihon` — bog'langan talabaning kelayotgan imtihon sessiyalari (bugundan boshlab 30 kun):
  sana va vaqt, fan va imtihon nomi, xona, `🎫 O'rindiq` (varaq bo'lsa) hamda
  `✅ Ruxsat` / `❌ Ruxsat yo'q` (varaqa holatiga qarab). Imtihon bo'lmasa:
  `Kelayotgan imtihonlar yo'q`.
- `/help` — buyruqlar ro'yxati

## Avtomatik eslatma

Bot har soatda vaqtni tekshiradi va mahalliy vaqt bilan **08:00–09:00** oralig'ida
kuniga bir marta bog'langan har bir foydalanuvchiga eslatma yuboradi:

- bugungi darslar (guruh jadvali bo'yicha),
- bugungi imtihon sessiyalari: talabaga `📝 Bugun imtihon: fan — nomi (xona, vaqt)`,
  o'qituvchiga o'zi o'tkazadigan sessiyalar va varaqalar holati
  (`🗂 12 varaq, 5 natija kiritilgan`),
- bugun tugaydigan deadline'lar: topshiriqlar va testlar (`dueAt`).

Eslatma matni `🌟`, `📌`, `⏰` belgilari bilan bezatilgan. O'qituvchilarga qo'shimcha
ravishda o'z darslari (guruh va `🔗` davomat havolasi bilan) hamda
"⏰ Davomatni belgilashni unutmang" eslatmasi va birinchi dars havolasi yuboriladi.

Eslatma bir kunda takroran yuborilmasligi uchun oxirgi yuborilgan sana
`bot/data.json` dagi `lastReminderDate` maydonida saqlanadi. Xatolik yuz bersa
(bitta foydalanuvchi yoki butun tekshiruv), bot ishlashda davom etadi.

## Eslatmalar

- `/davomat` va o'qituvchi eslatmasidagi havolalar `http://localhost:3000` ga ishora qiladi.
- `bot/data.json` — `{ "links": { chatId: email }, "lastReminderDate": "YYYY-MM-DD" }`.
  Eski (faqat chatId → email) fayl ham o'qiladi va keyingi saqlashda yangi formatga o'tadi.
  Fayl gitga qo'shilmaydi (`.gitignore` da).
- `bot/pending.json` — vaqtinchalik tasdiqlash kodlari
  (`{ "123456": { email, userId, expiresAt } }`). Sayt kodi yaratadi, bot tekshirib o'chiradi.
  Fayl gitga qo'shilmaydi (`.gitignore` da).
- Token yo'q bo'lsa skript aniq xato xabari bilan chiqadi (crash emas).
- Telegram xatolarida bot 5 sekund kutib qayta urinadi.
