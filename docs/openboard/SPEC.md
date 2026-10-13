# OpenBoard 2.0 — texnik spetsifikatsiya (agentlar uchun)

Repo: `/Users/probox/Documents/fbsu` (branch `feat/openboard`). Stack: Next.js 16 (App Router,
React 19, TS strict), Tailwind v4, zod v4, Prisma. Qoidalar: `AGENTS.md` — **kodda izoh
yozilmaydi**, `any` yo'q, `npm run build` oxirida o'tishi shart (integrationdan keyin).

Maqsad: `/board` sahifasini Apple Notes uslubidagi to'liq daftar-doskaga aylantirish:
eslatmalar (notes) ro'yxati + bloklardan iborat muharrir — matn, sarlavha, kod (Run bilan),
math formula (KaTeX), kimyoviy formula (mhchem), chizma (Excalidraw), rasm, jadval, cheklist,
laboratoriya shabloni.

## 0. Markaziy fayllar (o'zgartirilmaydi)

- `src/lib/openboard/types.ts` — zod sxemalar, tiplar, `OPENBOARD_LIMITS`, `createId`,
  `nowIso`, `emptyOpenboard`. (Tayyor.)
- `docs/openboard/SPEC.md` — shu fayl.

## 1. Fayl xaritasi va egalik (konflikt bo'lmasin)

| Ishchi | Fayllar |
|---|---|
| A1 | `src/lib/openboard/store.ts`, `src/app/api/openboard/route.ts`, `tests/openboard.test.ts` |
| A2 | `src/components/openboard/blocks/text-block.tsx`, `heading-block.tsx`, `code-block.tsx`, `src/lib/openboard/sanitize.ts`, `src/lib/openboard/code-runner.ts` |
| A3 | `src/components/openboard/blocks/formula-block.tsx` + `package.json` (katex dep) |
| A4 | `src/components/openboard/blocks/drawing-block.tsx`, `drawing-editor.tsx` |
| A5 | `src/components/openboard/blocks/image-block.tsx`, `table-block.tsx`, `checklist-block.tsx` |
| B (keyin) | `openboard-app.tsx`, `notes-sidebar.tsx`, `note-editor.tsx`, loader'lar, sahifa, layout |

Boshqa birovning fayliga TEGILMAYDI. Git commit qilinmaydi. `npm run build` ishga
tushirilmaydi (integration bosqichida). Ruxsat etilgan tekshiruvlar:
`npx eslint <fayllaringiz>`, `npx tsc --noEmit` (sekin bo'lsa shart emas), A1 uchun
`npx vitest run tests/openboard.test.ts`.

## 2. API va saqlash kontrakti

`GET /api/openboard` → auth (`getCurrentUser`, yo'q bo'lsa 401) →
`{ ok: true, data: { data: <xom JSON yoki null>, updatedAt: <ISO|null> } }`.
Xom JSON — `Board` jadvalidagi `userId + assignmentId=null` yozuvi (mavjud `/api/board`
bilan bir xil row; `findFirst({ where: { userId, assignmentId: null }, orderBy: { updatedAt: "desc" } })`).

`PUT /api/openboard` → auth + `verifyCsrfFromRequest` (403), body `{ data }`.
Validatsiya: `openboardDataSchema.safeParse` (xato → 400 `{ ok: false, error }`) va
o'lcham: `JSON.stringify(data).length <= OPENBOARD_LIMITS.maxPayloadBytes` (xato → 413).
Upsert: mavjud row bo'lsa `update`, bo'lmasa `create({ userId, assignmentId: null, data })`.
Javob: `{ ok: true, data: { updatedAt } }`. Route `src/app/api/board/route.ts` naqshini
ko'chirib ishlanadi (prisma, zod, csrf).

## 3. `store.ts` (A1) — sof funksiyalar, server-only importlarsiz

```ts
import { openboardDataSchema, emptyOpenboard, createId, nowIso, type OpenboardData, type OpenboardNote } from "./types";

export function migrateLegacy(raw: unknown, legacyTitle: string): { data: OpenboardData; needsSave: boolean };
```
Qoidalar: `null/undefined` → `{ emptyOpenboard(), needsSave: false }`;
`{ v: 2, kind: "excalidraw", elements: [] }` → bitta note
`{ icon: "✏️", title: legacyTitle, blocks: [{ type: "drawing", scene: elements,
sceneAppState: { viewBackgroundColor: "#ffffff" } }] }`, `needsSave: true`;
`openboardDataSchema.safeParse(raw).success` → `{ data, needsSave: false }`;
boshqa har qanday narsa → `{ emptyOpenboard(), needsSave: false }`.

```ts
export function createEmptyNote(title: string): OpenboardNote;      // bitta bo'sh text blok
export function createSketchNote(title: string): OpenboardNote;     // bitta drawing blok
export function createLabNote(title: string, labels: {
  goal: string; equipment: string; steps: string; measurements: string;
  calculation: string; conclusion: string; simLink: string;
}): OpenboardNote;
```
Lab shabloni bloklari tartibi: heading(goal) → text("") → heading(equipment) → text("") →
heading(steps) → checklist 3 bo'sh band → heading(measurements) → table 3 ustun × 3 qator
(header=true) → heading(calculation) → formula(tex: "") → heading(conclusion) → text("") →
text(html: `<a href="/labs">${simLink}</a>`). Barcha id lar `createId()`, `createdAt/updatedAt = nowIso()`.

```ts
export function stripHtml(html: string): string;          // teglarni olib tashlab, &nbsp; ni probelga
export function noteSnippet(note: OpenboardNote): string; // text/heading html laridan 90 belgi
export function searchNotes(notes: OpenboardNote[], query: string): OpenboardNote[];
export function touchNote(note: OpenboardNote, at?: string): OpenboardNote; // updatedAt yangilangan nusxa
export function parseOpenboard(raw: unknown): { ok: true; data: OpenboardData } | { ok: false; error: string };
export function payloadBytes(data: unknown): number;      // TextEncoder bilan uzunlik
export function newBlock(type: string, ...): OpenboardBlock; // note-editor "add block" uchun default bloklar
```
`newBlock` tiplari: `"text" | "heading" | "code" | "formula" | "chem" | "drawing" | "image" | "table" | "checklist"`.
Default: text `{html:""}`, heading `{html:"", level:2}`, code `{lang:"javascript", source:""}`,
formula/chem `{tex:""}`, drawing `{scene:[]}`, image `{src:"", alt:""}`, table `{header:true,
rows:[["",""],["",""],["",""]]}`, checklist `{items:[]}`.

## 4. Blok komponentlari — umumiy qoida

Har biri `"use client"`, props FAQAT: `{ block, onChange: (next) => void }`.
Chrome (o'chirish/yuqoriga/pastga, ramka, hover) — `note-editor`da, bloklarda EMAS.
Matnlar faqat `useI18n()` (`t("brd...")`) orqali — SPEC §7 dagi kalitlar.
Tailwind: slate asosiy, blue aksent, rose xato. Izohlar yo'q. `any` yo'q.

### 4.1 `text-block.tsx` (A2)
`TextBlockEditor({ block, onChange })`. `contentEditable` div (uncontrolled):
`ref` bilan `block.html` ni faqat `block.id` o'zgarganda yozish (kursor sakramasin!),
`onInput` → `onChange({ ...block, html: sanitizeHtml(el.innerHTML) })`.
Toolbar (kichik tugmalar, `onMouseDown={e => e.preventDefault()}`): Qalin (`bold`),
Kursiv, Tagchizilgan, `insertUnorderedList`, `insertOrderedList`, Inline kod
(`formatBlock` bilan `code`?), Iqtibos (`formatBlock: blockquote`, toggle).
`document.execCommand` ishlatiladi. Bo'sh holatda placeholder — CSS `:empty::before`
`content: attr(data-placeholder)`. `onPaste` → oddiy matn sifatida qo'yish
(`e.preventDefault()`, `execCommand("insertText", false, text)`). Min balandlik ~1 qator,
uslub: `text-sm leading-6 text-slate-800 focus:outline-none`.

### 4.2 `heading-block.tsx` (A2)
`HeadingBlockEditor({ block, onChange })`. Bitta qatorli contentEditable; level 1/2/3 →
`text-xl font-bold` / `text-lg font-semibold` / `text-base font-semibold`. Enter bosilsa
yangi qator ochilmaydi (`preventDefault`). Pastga o'q/tab? shart emas. Paste — oddiy matn.

### 4.3 `code-block.tsx` (A2)
`CodeBlockEditor({ block, onChange })`. Yuqori panel: `select` (lang:
javascript → "JavaScript", math → "Math (mathjs)", python → "Python", sql → "SQL",
c → "C", cpp → "C++", cs → "C#", java → "Java") + tugmalar: Run (`brdCodeRun`; faqat
`runnableLanguage(lang)` uchun ko'rinadi), Copy (`brdCodeCopy` → clipboard; 1.5s
`brdCodeCopied`). `textarea` monospace, avto-o'sish (ref + scrollHeight, max ~480px).
Natija: komponent ichidagi state (`CodeRunResult | null`) + `brdCodeRunning`; panel
`pre` (oq fon, slate-100 chekka), xato qatorlari rose rangda (`result.ok === false` → matn
rose-600), yorliq `brdCodeOutput`. Natija blokka SAQLANMAYDI.

`code-runner.ts` (A2):
```ts
export type CodeRunResult = { ok: boolean; lines: string[] };
export function runnableLanguage(lang: string): boolean;         // javascript, math
export async function runJavaScript(source: string, timeoutMs?: number): Promise<CodeRunResult>;
export async function runMath(source: string): Promise<CodeRunResult>;
```
`runJavaScript`: yashirin `iframe` (`sandbox="allow-scripts"`), `srcdoc` ichida
`console.log/warn/error` ni `lines` ga yig'uvchi va `postMessage` qiluvchi skript +
foydalanuvchi kodi `try/catch` da; 3000ms timeout → tozalash + `{ ok:false }`.
`</script>` va backtick'larni escape qilish SHART. `runMath`: `await import("mathjs")`,
`math.evaluate(source)` (2000 belgi limit), natijani `math.format` bilan satrga;
xato → `{ ok:false }`. mathjs allaqachon dependency — yangi paket qo'shilmaydi.

### 4.4 `sanitize.ts` (A2)
```ts
export function sanitizeHtml(raw: string): string;
```
Ruxsat etilgan teglar: `b,strong,i,em,u,s,strike,code,kbd,br,div,p,ul,ol,li,h1,h2,h3,
blockquote,pre,span,a`. Atributlardan faqat `a` uchun `href` (faqat `/` bilan boshlanadigan
yoki `http(s)://`). Boshqa hamma teg/atribut (script, img, on* h.k.) olib tashlanadi,
teg ichidagi matn saqlanadi. Regex-asosli, DOMParser'siz (node testda ham ishlashи kerak).

### 4.5 `formula-block.tsx` (A3)
Ikkita eksport: `FormulaBlockEditor({ block: FormulaBlock, onChange })` va
`ChemBlockEditor({ block: ChemBlock, onChange })` (ichki umumiy komponent).
Yuqori: `textarea` (tex) placeholder `brdFormulaPlaceholder` / `brdChemPlaceholder`;
pastda jonli preview (`katex.renderToString`, `displayMode: true`, `throwOnError: false`,
`strict: false`, dangerouslySetInnerHTML). Bo'sh bo'lsa `brdFormulaEmpty` (slate-400).
Chem uchun: agar tex ichida `\ce` bo'lmasa, `\ce{...}` ichiga o'raladi.
Chip-tugmalar: formula → `\frac{a}{b}`, `\sqrt{x}`, `\sum_{i=1}^{n}`, `\int_a^b f(x)\,dx`,
`\alpha, \beta, \theta`, `x^2 + y^2 = r^2`; chem → `2H2 + O2 -> 2H2O`,
`CuSO4·5H2O`, `CH3COOH <=> CH3COO^- + H^+`, `Fe2O3 + 3CO -> 2Fe + 3CO2`.
Fayl boshida: `import "katex/dist/katex.min.css";` va `import "katex/contrib/mhchem";`.
`package.json` ga `katex` qo'shiladi: `npm install katex@^0.16.47` (node_modules'da bor,
lekin dependency'ga rasmiy yozilishi kerak). Tip: `katex` typedeklarini tekshir
(`node_modules/katex/package.json` → `types`); yo'q bo'lsa `@types/katex` qo'sh.

### 4.6 `drawing-block.tsx` + `drawing-editor.tsx` (A4)
`DrawingBlockEditor({ block, onChange })`: karta — agar `block.preview` bo'lsa `img`
(h-44, object-contain, oq fon, chekka), bo'lmasa dashed box + `brdDrawEmpty`;
pastda `brdDrawOpen` tugma + element soni (kichik matn). Tugma modal ochadi.
`DrawingEditor({ block, onSave, onClose })`: `fixed inset-0 z-50` parda + oq panel
(~90vh); tepada sarlavha + `brdClear` (confirm: `brdClearConfirm` → `api.updateScene({ elements: [] })`)
+ `brdDrawDone`; ichida bitta `<Excalidraw>` instance (ref: `ExcalidrawImperativeAPI`).
`theme` — `useThemeMode()`. `initialData`: `{ elements: block.scene as ..., appState: { viewBackgroundColor: block.sceneAppState?.viewBackgroundColor ?? "#ffffff" } }`.
`brdDrawDone` bosilganda: `elements = api.getSceneElements()`,
`preview = await exportToBlob({ elements, appState: { exportBackground: true, viewBackgroundColor }, files: api.getFiles(), mimeType: "image/png", quality: 0.8, scale: 0.5 })`
— `exportToBlob` parametrlari `node_modules/@excalidraw/excalidraw/dist/types/**` dan
TEKSHIRILADI (0.18 API). `blob.size > 380_000` bo'lsa `scale: 0.3` bilan qayta.
Preview — dataURL; `onSave({ scene: elements, sceneAppState: { viewBackgroundColor }, preview })`
keyin `onClose()`. `block.scene` — `unknown[]`; excalidraw tiplariga cast uchun
`import type { ExcalidrawElement } from "@excalidraw/excalidraw/types"` (mavjudligini tekshir,
0.18'da shunday) + `as unknown as ExcalidrawElement[]`. `files`/`appState` uchun ham xuddi shunday.
Eslatma: repo'da `src/components/board/board-canvas.tsx` namuna sifatida bor.

### 4.7 `image-block.tsx` (A5)
`ImageBlockEditor({ block, onChange })`. `input type=file accept="image/*"` (yashirin +
tugma `brdImageAdd`/`brdImageReplace`). Fayl → `<img>` + `<canvas>`: eng katta tomon
1600px, `toDataURL("image/jpeg", 0.85)`; natija > 850_000 belgi bo'lsa 0.7, hali katta
bo'lsa 1000px ga kichraytirish; baribir katta bo'lsa alert `brdImageError`. Natija:
`{ ...block, src: dataUrl }`. Rasm `rounded-xl border` bilan, ostida caption input
(placeholder `brdImageCaption`).

### 4.8 `table-block.tsx` (A5)
`TableBlockEditor({ block, onChange })`. `header: true` — birinchi qator qalin (slate-100 fon).
Kataklar — controlled `input` (borderless, `w-full text-sm`). Pastda kichik tugmalar:
`brdTableAddRow` (oxiriga 1 qator), `brdTableAddCol` (har qatorga 1 ustun, maks 8),
`brdTableRemoveRow` / `brdTableRemoveCol` (oxirgisini o'chiradi, minimal 1×1 qoladi).
Grid: `display:grid` inline style `gridTemplateColumns: repeat(n, minmax(0,1fr))` yoki table.

### 4.9 `checklist-block.tsx` (A5)
`ChecklistBlockEditor({ block, onChange })`. Har band: checkbox (`done`), text input
(placeholder `brdChecklistPlaceholder`), o'chirish `×`. `done` bo'lsa matn `line-through
text-slate-400`. Enter — shu banddan keyin yangi bo'sh band (focus unga). Pastda
`+ ` `brdChecklistAdd`.

## 5. Shell komponentlari (B bosqichi — spec)

### 5.1 `note-editor.tsx`
Props: `{ note, onChange, onDelete, onDuplicate }`. Sarlavha input (placeholder
`brdNoteTitlePlaceholder`, `text-2xl font-semibold`), meta (updatedAt, `Intl.DateTimeFormat`),
o'ng burchakda: `brdNoteDuplicate`, `brdNoteDelete` (confirm `brdNoteDeleteConfirm`).
Bloklar ro'yxati: har blok `group relative rounded-xl` — hoverda o'ng yuqorida kichik
tugmalar: ↑ (`brdMoveUp`), ↓ (`brdMoveDown`), × (`brdBlockDelete`). Bloklarni almashtirish:
`updateBlock`, `removeBlock`, `moveBlock(+1/-1)` — hammasi `note` nusxasini `onChange` bilan.
Pastda `brdAddBlock` paneli: chiplar — text/heading/code/formula/chem/drawing/image/
table/checklist + `brdBlockLab` (lab shablonini joriy note'ga qo'shadi — `createLabNote`
bloklaridan foydalanadi, sarlavhasiz). Bloklar `next/dynamic` bilan lazy yuklanadi
(`ssr: false`) — Excalidraw/katex og'ir.

### 5.2 `notes-sidebar.tsx`
Props: `{ notes, selectedId, onSelect, onCreate, onDelete, onDuplicate }`. Yuqorida:
qidiruv input (`brdSearchPlaceholder`), `+` menyu (`brdNewEmpty`, `brdNewSketch`,
`brdNewLab`). Ro'yxat — updatedAt desc, filtr `searchNotes`. Element: icon (emoji),
title (bo'sh bo'lsa `brdUntitled`), snippet (1 qator, truncate), sana
(`Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" })`). Aktiv — `bg-blue-50`.
Bo'sh ro'yxat — `brdEmptyNotes`; qidiruv natijasiz — `brdSearchEmpty`. Pastda
`brdNoteCount` ({count}). O'chirish: hoverda `×` (confirm `brdNoteDeleteConfirm`).

### 5.3 `openboard-app.tsx`
`"use client"`. Yuklash: `apiFetch("/api/openboard")` → `json.data.data` →
`migrateLegacy(raw, t("brdNewSketch"))` → agar `needsSave` bo'lsa darhol saqlash rejasi.
`notes.length === 0` bo'lsa — `createEmptyNote(t("brdNewNote"))` qo'shiladi.
State: `data | null`, `selectedId`, `status: "loading"|"idle"|"saving"|"saved"|"error"|"offline"`.
Har o'zgarishda: note'ni `touchNote` qilib almashtirish; avtosave — 900ms debounce +
10s interval (faqat dirty bo'lsa); `PUT /api/openboard` body `{ data }` (apiFetch CSRF'ni
o'zi qo'shadi). Xato → `brdSaveError` + keyingi intervalda qayta urinish. Status badge:
`brdSaving`, `brdSaved` (2s dan keyin idle), `brdSaveError`, `commonLoading`.
Layout: `md:grid md:grid-cols-[19rem_1fr]` ramkali karta (`rounded-2xl border
border-slate-200 bg-white overflow-hidden`), balandlik `h-[calc(100vh-10rem)] min-h-[28rem]`;
mobil: sidebar tepada (max-h-56 scroll).

### 5.4 Loader va sahifa
`openboard-loader.tsx` — `dynamic(() => import("./openboard-app").then(m => m.OpenboardApp), { ssr: false, loading: skeleton })`.
`board-loader.tsx`: `assignmentId` bo'lsa — eski `BoardCanvas` (o'zgarmasin), aks holda
`OpenboardApp`. Sahifa `/board` — `PageHeader` qoladi.

## 6. i18n

Yangi kalitlar `src/i18n/dict/{uz,ru,en}/brd.ts` da ALLAQACHON qo'shilgan (shu SPEC bilan
birga). Faqat shu kalitlarni ishlatish; ro'yxat: `brdNewNote, brdNewEmpty, brdNewSketch,
brdNewLab, brdSearchPlaceholder, brdSearchEmpty, brdEmptyNotes, brdUntitled, brdNoteDelete,
brdNoteDeleteConfirm, brdNoteDuplicate, brdNoteCount, brdAddBlock, brdBlockText,
brdBlockHeading, brdBlockCode, brdBlockFormula, brdBlockChem, brdBlockDrawing, brdBlockImage,
brdBlockTable, brdBlockChecklist, brdBlockLab, brdMoveUp, brdMoveDown, brdBlockDelete,
brdTextPlaceholder, brdBold, brdItalic, brdUnderline, brdStrike, brdBulletList,
brdNumberList, brdInlineCode, brdQuote, brdCodeRun, brdCodeCopy, brdCodeCopied,
brdCodeOutput, brdCodeLang, brdCodePlaceholder, brdCodeRunning, brdFormulaPlaceholder,
brdFormulaEmpty, brdChemPlaceholder, brdChemHint, brdDrawOpen, brdDrawEmpty, brdDrawDone,
brdImageAdd, brdImageReplace, brdImageError, brdImageCaption, brdTableAddRow,
brdTableAddCol, brdTableRemoveRow, brdTableRemoveCol, brdChecklistAdd,
brdChecklistPlaceholder, brdLabGoal, brdLabEquipment, brdLabSteps, brdLabMeasurements,
brdLabCalculation, brdLabConclusion, brdLabSimLink, brdNoteTitlePlaceholder, brdClose`
+ eski: `brdSaving, brdSaved, brdSaveError, brdClear, brdClearConfirm, brdHint,
brdAutosaveHint` va h.k.

## 7. DoD (har ishchi o'zi tekshiradi)

1. Fayllar SPEC'dagidek, boshqa fayl tegilmagan.
2. `npx eslint <fayllar>` xatosiz (warning bo'lishi mumkin).
3. A1: `npx vitest run tests/openboard.test.ts` — yashil. Testlar: migrateLegacy (null,
   v2→v3, v3, noma'lum), createLabNote tuzilishi, stripHtml/noteSnippet, searchNotes,
   payloadBytes, API GET/PUT (prisma mock + csrf mock — `tests/courses-create.test.ts`
   namunasidek) + 400 (noto'g'ri data) + 413 (katta payload) + 401/403.
4. Izohlar yo'q, `any` yo'q, o'zbekcha UI matnlari faqat `t()` orqali.
5. Hisobot: 1-2 jumla + o'zgargan fayllar ro'yxati + tekshiruv natijasi.
