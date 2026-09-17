import type { ClimbingStyle } from "@prisma/client";

// Returns a sortable difficulty rank (higher = harder). Unparsable grades
// sort last. Supports V-scale (boulder) and French/sport scale (route).
export function gradeRank(style: ClimbingStyle, grade: string): number {
  const g = grade.trim().toUpperCase();
  if (style === "BOULDER") {
    const m = g.match(/^V\s*(\d+)/);
    return m ? parseInt(m[1], 10) : -1;
  }
  const m = g.match(/^(\d+)\s*([A-C])?(\+)?/);
  if (m && m[2]) {
    const num = parseInt(m[1], 10);
    const letter = m[2].charCodeAt(0) - 65; // A=0, B=1, C=2
    const plus = m[3] ? 0.5 : 0;
    return num * 3 + letter + plus;
  }
  if (m) return parseInt(m[1], 10) * 3;
  return -1;
}
