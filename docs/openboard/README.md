# OpenBoard 2.0 — "Onlayn doska va daftar"

`/board` sahifasi — Apple Notes uslubidagi daftar: chapda eslatmalar ro'yxati, o'ngda
blokli muharrir. Har bir eslatma bloklardan tuziladi:

| Blok | Imkoniyat |
|---|---|
| Matn | rich-text (qalin, kursiv, ro'yxatlar, iqtibos, inline kod) |
| Sarlavha | 1–3 daraja |
| Kod | JavaScript va Math (mathjs) — **Run**; Python/SQL/C/C++/C#/Java — nusxalash |
| Formula | LaTeX (KaTeX) jonli ko'rinish |
| Kimyoviy formula | mhchem (\ce{...}) — `2H2 + O2 -> 2H2O` kabi |
| Chizma | Excalidraw doska (modal), PNG preview saqlanadi |
| Rasm | dataURL (1600px gacha kichraytirilgan) |
| Jadval | o'lchovlar jadvali (qator/ustun boshqaruvi) |
| Cheklist | laboratoriya qadamlari |
| Lab shabloni | bitta tugmada to'liq hisobot tuzilishi (maqsad → xulosa) |

Laboratoriya shabloni `/labs` simulyatsiyalariga havola beradi.

## Saqlash

- `Board` jadvali, `assignmentId = null` yozuvi, `data` JSON v3
  (`{ v: 3, kind: "openboard", notes: [...] }`).
- Avtosave: 900ms debounce + 10s xavfsizlik intervali; holat badge'i sahifada.
- Eski v2 (`kind: "excalidraw"`) yozuv birinchi ochilganda avtomatik v3 ga ko'chiriladi.
- Topshiriq doskasi (`/board?assignment=<id>`) avvalgidek ishlaydi (`BoardCanvas`).

## API

- `GET /api/openboard` → `{ ok, data: { data, updatedAt } }`
- `PUT /api/openboard` body `{ data }` (CSRF himoyasi bilan) → `{ ok, data: { updatedAt } }`
- Limitlar: `src/lib/openboard/types.ts` → `OPENBOARD_LIMITS` (payload 9MB, 120 eslatma,
  250 blok, rasm 900k belgi va h.k.)

## Kod xaritasi

- `src/lib/openboard/types.ts` — sxema/tiplar; `store.ts` — sof yordamchilar;
  `sanitize.ts`, `code-runner.ts`
- `src/components/openboard/openboard-app.tsx` — holat + avtosave
- `src/components/openboard/notes-sidebar.tsx`, `note-editor.tsx`
- `src/components/openboard/blocks/*` — blok muharrirlari
- `src/app/api/openboard/route.ts` — API
- Testlar: `tests/openboard.test.ts`

## Tekshiruv

```bash
npx vitest run tests/openboard.test.ts
npm run build
```

E2E: login (`ozodbek@ttpu.uz` / `ttpu1234`) → `/board` → eslatma yaratish, blok qo'shish,
Run, formula, reload'dan keyin saqlanishi.
