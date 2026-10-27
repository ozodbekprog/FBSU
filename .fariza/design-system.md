# Design system — qoidalar

> Bu fayl qo'lda yoziladi va **birlamchi manba**. `design-system.auto.md` faqat faktlar
> (rang, shrift, komponentlar). Ziddiyat bo'lsa — shu fayldagi qoida ustun.

## 1. Identitet

- Mahsulot / auditoriya:
- Ohang (3 so'z):
- Nima uchun bu dizayn shunday ko'rinadi (1 jumla):

## 2. Tokenlar (qat'iy)

| Rol | Qiymat | Izoh |
|---|---|---|
| Fon | | |
| Matn | | |
| Aksent | | faqat 1 ta |
| Xato | | |
| Yumshoq fon | | |

- Shrift: display / body / mono
- Type scale:
- Radius shkalasi:
- Spacing birligi: 4px tarmoq
- Soyalar:

## 3. Layout

- Container kengligi / gutter:
- Breakpointlar:
- Sahifa tuzilishi (header → main → footer):
- Zichlik: (kompakt / qulay)

## 4. Komponentlar

- Tugmalar: (variantlar, o'lchamlar)
- Formalar: (label joyi, xato holati)
- Kartalar:
- Jadvallar:
- Bo'sh holatlar (empty state):

## 5. Harakat (motion)

- Davomiylik: 150–250ms; easing: ease-out
- Ruxsat etilgan: holat o'zgarishi, ochilish/yopilish
- Taqiqlangan: scroll bo'yicha fade-up, har kartada hover animatsiya

## 6. Taqiqlangan naqshlar

- Gradient matn, neon glow, shishasimon (glass) panellar — faqat asosli sabab bilan
- Emoji ikonkalar; ikonka uchun mavjud kutubxona
- 3 tadan ortiq shrift oilasi
- "01 / 02 / 03" raqamlash (agar ketma-ketlik bo'lmasa)
- Cheksiz animatsiya (loader'dan tashqari)

## 7. Accessibility

- Kontrast: matn ≥ 4.5:1
- Fokus halqasi har interaktiv elementda
- `prefers-reduced-motion` hisobga olinadi
- Formalar: `<label>` + `aria-invalid` + matnli xato

## 8. Matn (copy)

- Sarlavha: nima qiladi, kim uchun (12 so'zdan kam)
- Tugma: fe'l + obyekt ("Kurs qo'shish")
- Bo'sh holat: nima yo'q + nima qilish kerak
- Raqamlar: o'zbekcha format (1 234, 12%)

## 9. Tekshiruv ro'yxati (topshirishdan oldin)

- [ ] Tokenlardan tashqari hex rang yo'q
- [ ] Barcha holatlar: default / hover / focus / disabled / loading / empty / error
- [ ] 360px va 1440px da buzilmaydi
- [ ] Skrinshot olingan va `design-critic` dan o'tgan
- [ ] `npm run build` yashil
