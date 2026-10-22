/**
 * Shifrlangan maydonlarda qidiruv uchun yordamchilar.
 *
 * Maydonlar bazada shifrlangan bo'lgani uchun `contains` filtri ishlamaydi:
 * mos yozuvlar oldin o'qiladi (extension ularni deshifrlaydi), so'ng qiymatlar
 * ilova tomonida solishtiriladi.
 */
export function textMatches(
  query: string,
  values: Array<string | null | undefined>,
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return values.some(
    (value) => typeof value === "string" && value.toLocaleLowerCase().includes(needle),
  );
}
