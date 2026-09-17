import type { ClimbingStyle } from "@prisma/client";

// Parses "<number><optional a/b/c><optional +>" (French/sport scale, and
// also the plain German/Fontainebleau gym scale like "4", "6+") into a
// sortable rank. Letter/plus are optional so bare numbers still parse.
function parseNumberLetterPlus(grade: string): number | null {
  const m = grade.match(/^(\d+)\s*([A-C])?(\+)?/);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const letter = m[2] ? m[2].charCodeAt(0) - 65 : 0; // A=0, B=1, C=2
  const plus = m[3] ? 0.5 : 0;
  return num * 3 + letter + plus;
}

// Returns a sortable difficulty rank (higher = harder). Unparsable grades
// sort last. Boulder supports V-scale ("V5") and the plain German/Font
// numeric scale ("4", "6+"); route supports the French/sport scale.
export function gradeRank(style: ClimbingStyle, grade: string): number {
  const g = grade.trim().toUpperCase();

  if (style === "BOULDER") {
    const v = g.match(/^V\s*(\d+)/);
    if (v) return parseInt(v[1], 10);
    const numeric = parseNumberLetterPlus(g);
    return numeric ?? -1;
  }

  return parseNumberLetterPlus(g) ?? -1;
}
