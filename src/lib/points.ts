/** Butun ballarni ortiqcha ".0" kasrsiz ko'rsatadi: 12 → "12", 2.2 → "2.2". */
export function formatPoints(value: number, fractionDigits = 1) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(fractionDigits);
}
