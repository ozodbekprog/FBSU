# FBSU LMS → Figma'ga ko'chirish yo'riqnomasi

Bu papkada saytni Figma'ga o'tkazish uchun kerakli hamma narsa tayyor:

- `screenshots/` — **55 ta skrinshot** (har rol, har sahifa, 1440×900 — Figma Desktop frame standarti)
- `design-tokens.md` — ranglar, tipografika, soyalar, radiuslar, animatsiyalar
- `SAHIFALAR-XARITASI.md` — rol bo'yicha sahifalar ro'yxati va demo loginlar

---

## 1-usul (eng yaxshi): html.to.design plugin — haqiqiy qatlamlar bilan

Bu plugin sahifani **CSS bilan vektor qatlamlarga** aylantirib Figma'ga olib kiradi
(oddiy rasm emas — tugma, matn, quti alohida bo'ladi).

1. Figma'da: `Resources → Plugins → "html.to.design"` o'rnating (bepul versiyasi bor)
2. Chrome'ga hamroh kengaytmasini o'rnating: [html.to.design saytidan](https://html.to.design)
3. Chrome'da **fbsu.vercel.app saytiga kiring** (o'z akkauntingiz bilan login qiling)
4. Figma'da plugin'ni oching → `Connect` → brauzer sahifasini tanlang
5. Har sahifada `Capture` bosing — sahifa Figma'da Frame bo'lib paydo bo'ladi
6. Takrorlang: dashboard → courses → schedule → ... (Sahifalar xaritasidagi ro'yxat)

> Chegara: bepul versiyada oyiga cheklangan sahifa (odatda 3). Hamma 55 sahifa kerak
> bo'lsa — 2-usulni ham qo'llang yoki faqat eng muhim 10-15 sahifani plugin bilan oling.

## 2-usul: skrinshotlarni import qilish (tez, lekin rasm qatlami)

1. Figma'da yangi file oching
2. Har rol uchun **Frame** (1440×900) yarating: Talaba, O'qituvchi, Admin, ...
3. `screenshots/` papkasidan PNG fayllarni to'g'ridan-to'g'ri Figma'ga sudrab tashlang
   (yoki `File → Place image`, yoki Finder'dan drag-drop)
4. Skrinshot ustiga yozuv qo'yib, sahifa nomini belgilang

> Tavsiya: skrinshotlarni "reference" qatlam sifatida ishlatib, ustidan dizayn
> qatlamlarini qayta qurish (pixel-perfect oson bo'ladi).

## 3-usul: qo'lda qayta qurish (full control)

`design-tokens.md` dagi tokenlardan Figma'da birinchi navbatda:

1. **Color styles**: brand 50-950 (11 ta), gold 300-800, slate standartlari
2. **Text styles**: Geist Sans (Inter bilan almashtirsa bo'ladi) — 6 daraja
3. **Effect styles**: Card shadow, Lift shadow
4. **Komponentlar**: Button (primary/secondary/sm), Card, Badge (6 tone),
   Input, Select, Table row, StatTile, Sidebar, EmptyState, Progress

## Qaysi sahifalar eng muhim (taqdimot uchun 10 talik)

1. `01-talaba/dashboard` — eng boy sahifa (QR, plitkalar, chartlar)
2. `03-admin/admin` — boshqaruv paneli
3. `04-rektor/monitoring` — rahbariyat ko'rsatkichlari
4. `03-admin/documents` — hujjatlar aylanmasi
5. `03-admin/diplomas` — QR-diplomlar
6. `03-admin/finance` — moliya
7. `06-ota-ona/parent` — ota-onalar portali
8. `02-oqituvchi/journal` — o'qituvchi jurnali
9. `01-talaba/courses` — kurslar katalogi
10. `00-login` + `00-diplom-tekshirish` — ochiq sahifalar

## Demo loginlar (plugin/brauzer uchun)

Parol hammasiga: `ttpu1234`

| Rol | Login |
|---|---|
| Talaba | ai1s01@ttpu.uz |
| O'qituvchi | fizika@ttpu.uz |
| Admin | admin@ttpu.uz |
| Rektor | rektor@ttpu.uz |
| Registrator | registrator@ttpu.uz |
| Ota-ona | ota-ona@ttpu.uz |
| Xodim | buxgalter@ttpu.uz |
