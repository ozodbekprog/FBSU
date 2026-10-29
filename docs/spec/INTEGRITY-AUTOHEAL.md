# Yaxlitlik va avto-tiklash (integrity auto-heal)

`scripts/integrity-heal.mjs` har soatda repo fayllarini imzolangan manifest bilan solishtiradi.
Farq topilsa — Telegram alert yuboradi va (ruxsat berilgan bo'lsa) imzolangan `tar.gz` paketdan
faqat o'zgargan/yo'qolgan fayllarni tiklaydi, keyin servisni restart qiladi.

## Arxitektura

```
manifest-build  ->  manifest.json + manifest.sig (HMAC-SHA256, OWNER_INTEGRITY_SECRET)
        |
        v
hourly cron/systemd  ->  integrity-heal
        |
        +-- manifest.json + .sig o'qish
        +-- imzo tekshirish (buzilgan bo'lsa: alert + exit 1, fail-closed)
        +-- fayllarni qayta hash qilish (sha256, stream) -> changed / missing / extra
        +-- farq yo'q: jim exit 0
        +-- farq bor: alert + hisobot (har ro'yxatdan maks 20 ta)
              +-- --dry-run: faqat hisobot
              +-- INTEGRITY_ARTIFACT_URL: yuklash -> (ixtiyoriy sha256) -> tar -xzf -> changed/missing fayllar
              +-- extra fayllar O'CHIRILMAYDI (hisobotda qoladi)
              +-- INTEGRITY_RESTART_CMD: restart
              +-- exit 0 (tiklandi) / 1 (tiklolmadi)
```

Manifest tarkibi: `{ appDir, files, createdAt, patterns, ignore }`.
`files` — nisbiy yo'l -> sha256. Imzo `canonicalJson` (kalitlar saralangan) ustidan hisoblanadi,
shuning uchun JSON formatlash o'zgarsa ham imzo barqaror.

## Buyruqlar

```bash
export OWNER_INTEGRITY_SECRET='<uzun tasodifiy kalit>'
node scripts/manifest-build.mjs                       # .integrity/manifest.json + manifest.sig
node scripts/manifest-build.mjs --dirs src,prisma     # yo'llar ro'yxatini almashtirish
node scripts/integrity-heal.mjs --dry-run             # faqat tekshiruv
node scripts/integrity-heal.mjs                       # tekshiruv + tiklash
node scripts/integrity-heal.mjs --self-test           # PASS/FAIL (exit code)
```

Artifact namuna (manifestdagi fayllardan):

```bash
tar -czf fbsu-integrity.tar.gz $(node -e "const m=require('./.integrity/manifest.json');console.log(Object.keys(m.files).join(' '))")
sha256sum fbsu-integrity.tar.gz
```

## Env

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `OWNER_INTEGRITY_SECRET` | ha | HMAC-SHA256 kaliti; manifest yaratish va tekshirishda bir xil bo'lishi shart |
| `INTEGRITY_ARTIFACT_URL` | tiklash uchun | `tar.gz` manzili (http/https); repo tuzilishi bilan bir xil yo'llar |
| `INTEGRITY_ARTIFACT_SHA256` | yo'q | Yuklangan arxivning sha256 qiymati (mos kelmasa tiklanmaydi) |
| `INTEGRITY_RESTART_CMD` | yo'q | Tiklangandan keyin ishlaydigan buyruq, masalan `pm2 restart fbsu` |
| `TELEGRAM_BOT_TOKEN` | yo'q | Alert uchun bot tokeni |
| `OWNER_TELEGRAM_ID` | yo'q | Alert qabul qiluvchi chat id |

Barcha buyruqlar faqat env'dan olinadi; foydalanuvchi kiritgan matndan shell buyrug'i yasalmaydi.
Artifact va `tar` yo'llari `execFile`/`execFileSync` bilan argument massivi ko'rinishida beriladi.

## Cron / systemd

```cron
0 * * * * cd /opt/fbsu && /usr/bin/node scripts/integrity-heal.mjs >> /var/log/fbsu-integrity.log 2>&1
```

`/etc/systemd/system/fbsu-integrity.service`:

```ini
[Unit]
Description=FBSU integrity check

[Service]
Type=oneshot
WorkingDirectory=/opt/fbsu
EnvironmentFile=/opt/fbsu/.env
ExecStart=/usr/bin/node /opt/fbsu/scripts/integrity-heal.mjs
```

`/etc/systemd/system/fbsu-integrity.timer`:

```ini
[Unit]
Description=Hourly FBSU integrity check

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

`systemctl enable --now fbsu-integrity.timer`.

## Cheklovlar

- **Root ataylab buzsa**, cron/timerni ham o'chirishi yoki manifestni qayta imzolashi mumkin.
  Bu holatda himoya faqat immutable infratuzilma (read-only root, remote log, tashqi monitor)
  bilan ta'minlanadi.
- Artifact serveri **alohida** joyda va faqat o'qish uchun saqlanishi kerak; u buzilgan taqdirda
  tiklash ham buzilgan kodni qaytaradi (shuning uchun `INTEGRITY_ARTIFACT_SHA256` tavsiya etiladi).
- `extra` fayllar o'chirilmaydi — ular qo'lda ko'rib chiqiladi (noto'g'ri o'chirishdan himoya).
- Tiklash faqat manifestdagi yo'llar bilan cheklanadi; manifestdan tashqari fayllar tekshirilmaydi.
- Birinchi ishga tushirishdan oldin `manifest-build` bajarilishi va secretning xavfsiz saqlanishi
  (`.env`, huquq `0600`) shart.
