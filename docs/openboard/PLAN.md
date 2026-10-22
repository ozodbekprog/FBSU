# OpenBoard 2.0 — reja (orchestrator)

Maqsad: `/board` ni Apple Notes uslubidagi to'liq "Doska & Daftar" moduliga aylantirish va
sidebar'da qayta yoqish. Batafsil: `SPEC.md`.

## To'lqinlar

1. **W0 (orchestrator)** — types.ts, i18n kalitlar, SPEC. ✅
2. **W1 (5 parallel ishchi)** — A1 API+testlar, A2 matn/sarlavha/kod+runner, A3 formula/kimyo
   (katex), A4 chizma (Excalidraw), A5 rasm/jadval/cheklist.
3. **W2 (orchestrator + 1 ishchi)** — shell: openboard-app, sidebar, note-editor, loader'lar,
   sahifa, `/board` havolasini sidebar va topshiriq sahifasiga qaytarish.
4. **W3 (tekshiruv)** — `npm run build`, lint, vitest (yangi + eski), E2E: dev serverda
   login → /board → eslatma yaratish → kod Run → formula → reload persistence (Playwright).
5. **W4 (tuzatish + hujjat)** — topilgan xatolar, STATUS.md + docs/openboard/README.md,
   commit (faqat openboard fayllari).

## Chegaralar

- `prisma/schema.prisma` — TEGILMAYDI (Board.data JSON v3 yetarli). Repo'da boshqa
  ishlanmaning uncommitted o'zgarishlari bor — ularga tegilmaydi, commit qilinmaydi.
- Eski topshiriq-doskasi (`?assignment=`) — ishlashicha qoladi.
- Yangi tashqi paket: faqat `katex`.
