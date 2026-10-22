/**
 * Nav panelida faol (active) bo'lishi kerak bo'lgan havola.
 *
 * Soddalashtirilgan `pathname.startsWith(href + "/")` yondashuvi noto'g'ri:
 * `/finance/rates` yo'lida ham `/finance`, ham `/finance/rates` faol bo'lib
 * qolardi (oldingisi ikkinchisining prefiksi). Yechim — aniq moslik ustun
 * turadi, prefiks esa faqat boshqa mos bo'lmaganda ishlatiladi.
 */
export function resolveActiveHref(pathname: string | null, hrefs: string[]): string | null {
  if (!pathname) return null;

  // Aniq moslik har doim ustun turadi.
  if (hrefs.includes(pathname)) return pathname;

  // Aks holda eng uzun (eng aniq) prefiks mosligini tanlaymiz.
  let best: string | null = null;
  let bestLength = -1;
  for (const href of hrefs) {
    if (pathname.startsWith(`${href}/`) && href.length > bestLength) {
      best = href;
      bestLength = href.length;
    }
  }
  return best;
}

/** Bitta havola hozirgi yo'l uchun faolmi. */
export function isNavActive(pathname: string | null, activeHref: string | null, href: string): boolean {
  return activeHref !== null && activeHref === href;
}