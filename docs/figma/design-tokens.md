# FBSU LMS — Dizayn tokenlari (Figma uchun)

> Manba: `src/app/globals.css` (`@theme` bloki). Tailwind CSS v4.

## Ranglar (Color styles)

### Brand (asosiy ko'k)

| Nomi | HEX | Ishlatilishi |
|---|---|---|
| brand-50 | `#F3F6FC` | yumshoq fon |
| brand-100 | `#E6ECF8` | hover fon |
| brand-200 | `#C9D6EE` | chegara |
| brand-300 | `#A3B8E0` | chegara |
| brand-400 | `#7693CD` | ikkinchi darajali |
| brand-500 | `#5373B8` | tugma gradient tepasi |
| brand-600 | `#3F5A9D` | tugma |
| brand-700 | `#34497F` | link/hover |
| brand-800 | `#2B3C68` | sarlavhalar |
| brand-900 | `#1D3460` | asosiy to'q rang |
| brand-950 | `#131F3C` | eng to'q (sarlavha matni) |

### Gold (oltin aksent)

| Nomi | HEX |
|---|---|
| gold-300 | `#E3C76A` |
| gold-400 | `#D4AF37` |
| gold-500 | `#C9A227` |
| gold-600 | `#A9871F` |
| gold-700 | `#8A6D18` |
| gold-800 | `#7A5F14` |

### Yuzalar va standartlar

- **surface**: `#F6F7FA` (sahifa foni)
- Oq kartalar: `#FFFFFF`, chegara `#E2E8F0` (slate-200), matn `#0F172A` (slate-900),
  ikkinchi darajali matn `#64748B` (slate-500)
- Holat ranglari (Tailwind standart): emerald (muvaffaqiyat), amber (ogohlantirish),
  rose (xato), blue, purple, slate (badge tonlari)

### Gradientlar (koddan)

- Tugma (primary): `linear-gradient(#2B3C68 → #131F3C)` brand-800→950
- StatTile tepa chizig'i: `linear-gradient(90°, #1D3460 → #5373B8 → #D4AF37)`
- Bar chart: `linear-gradient(#5373B8 → #1D3460)` vertikal
- Line chart: `linear-gradient(90°, #1D3460 → #D4AF37)`
- Sidebar: `linear-gradient(#131F3C → #1D3460)` kabi to'q ko'k

## Tipografika

| Nomi | O'lcham / qalinlik | Ishlatilishi |
|---|---|---|
| Display | 30-36px / 700 | Hero sarlavha |
| H1 (PageHeader) | 24-28px / 700 | Sahifa sarlavhasi |
| H2 (Section) | 18px / 600 | Bo'lim sarlavhasi |
| H3 (Card) | 14-16px / 600 | Karta sarlavhasi |
| Body | 14px / 400 | Asosiy matn |
| Small | 12px / 400-500 | Ikkinchi darajali |
| Tiny | 11px / 500 | Badge, sana, imzo |
| Mono (raqamlar) | 12-14px / 600 | Raqamlar, vaqt, kodlar |

**Font**: Geist Sans (body) + Geist Mono (raqam/kod). Figma'da **Inter** bilan
almashtirish mumkin — deyarli bir xil.

## Spacing (4px bazada)

| Token | Px |
|---|---|
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 5 | 20 |
| 6 | 24 |
| 8 | 32 |

Kartalar orasi: **16px** (gap-4). Sahifa ichki chekinish: 24px. Bo'limlar orasi: 24px.

## Radius

| Nomi | Px | Ishlatilishi |
|---|---|---|
| rounded-lg | 8 | Input, kichik tugma |
| rounded-xl | 12 | Qatorlar, chip, badge |
| rounded-2xl | 16 | Kartalar |
| rounded-3xl | 24 | Hero, katta bloklar |
| rounded-full | — | Avatar, pil, doira |

## Soyalar (Effect styles)

| Nomi | Qiymat |
|---|---|
| Card | `0 1px 2px rgba(16,24,40,0.04), 0 10px 28px -14px rgba(29,52,96,0.14)` |
| Lift (hover) | `0 2px 6px rgba(16,24,40,0.05), 0 16px 36px -16px rgba(29,52,96,0.22)` |

## Animatsiyalar (Prototip uchun)

| Nomi | Qo'llanilishi |
|---|---|
| fade-up 450ms | Kartalar/bo'limlar kirishi (translateY 10px → 0) |
| fade-in 400ms | Oddiy ko'rinishlar |
| grow-y 700ms | Bar chart ustunlari |
| draw 1.2s | Line chart chizig'i |
| pulse-ring 2.2s | Davomat tasdig'i halqasi |
| shimmer 1.6s | Loading skeleton |
| countdown 20s | QR vaqt chizig'i |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (yumshoq "easeOut" uslubi).

## Asosiy komponentlar (qayta qurish uchun)

1. **Sidebar** (kengligi ~256px, to'q ko'k gradient, 3D-ikonkali nav)
2. **Button**: primary (gradient), secondary (chegara), size sm/lg
3. **Card**: oq, rounded-2xl, chegara slate-200/70, CardHeader + CardBody
4. **Badge**: 6 tone (slate/blue/green/amber/rose/purple)
5. **Input/Select/Textarea**: rounded-lg, slate chegara
6. **StatTile**: gradient tepa chizig'i + katta raqam
7. **Table**: bosh qator slate-50, qatorlar border-b
8. **EmptyState**: markazlashgan ikonka + matn
9. **Progress**: brand rangli chiziq
10. **Chartlar**: Bar (gradient), Line (oltin tugash), Donut (markazda jami)
