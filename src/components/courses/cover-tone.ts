export const COURSE_COVER_COLORS = [
  "#2b4b7e",
  "#3f5a9d",
  "#496da3",
  "#5373b8",
  "#1d3460",
  "#31548c",
] as const;

const LEGACY: Record<string, string> = {
  "#2563eb": "#2b4b7e",
  "#16a34a": "#3a5c8e",
  "#dc2626": "#1d3460",
  "#9333ea": "#5373b8",
  "#ea580c": "#3f5a9d",
  "#0891b2": "#31548c",
  "#4f46e5": "#24406f",
  "#be185d": "#496da3",
  "#0ea5e9": "#31548c",
  "#7c3aed": "#5373b8",
  "#334155": "#22344f",
  "#b45309": "#3f5a9d",
  "#db2777": "#496da3",
  "#65a30d": "#2b4b7e",
  "#c026d3": "#3a5c8e",
  "#0d9488": "#1d3460",
};

export function courseCoverColor(value: string): string {
  if ((COURSE_COVER_COLORS as readonly string[]).includes(value)) return value;
  return LEGACY[value.toLowerCase()] ?? "#2b4b7e";
}

export function courseCoverStyle(value: string): { background: string } {
  return {
    background: `linear-gradient(125deg, ${courseCoverColor(value)} 0%, #0b1422 94%)`,
  };
}
