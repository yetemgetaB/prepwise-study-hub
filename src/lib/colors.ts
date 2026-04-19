// Accessible course color palette (AA contrast against white text)
export const COURSE_PALETTE = [
  "#1D417B", "#2563EB", "#7C3AED", "#DB2777",
  "#DC2626", "#EA580C", "#CA8A04", "#16A34A",
  "#0D9488", "#0284C7", "#4F46E5", "#9333EA",
];

export function pickCourseColor(usedColors: string[]): string {
  for (const c of COURSE_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return COURSE_PALETTE[usedColors.length % COURSE_PALETTE.length];
}

// Returns white or near-black based on luminance for AA contrast
export function readableTextOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.6 ? "#0B1220" : "#F8FAFC";
}
