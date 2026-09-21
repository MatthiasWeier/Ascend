// Content of a CLIMBING group post: one climbing day, stored as JSON so every
// viewer renders it in their own language. Pure helpers, safe on the client.
export type ClimbingSummary = { boulder: Record<string, number>; routes: number };

export function parseClimbingContent(content: string | null): ClimbingSummary {
  try {
    const data = JSON.parse(content ?? "{}");
    const boulder: Record<string, number> = {};
    for (const [grade, count] of Object.entries(data.boulder ?? {})) {
      if (typeof count === "number" && count > 0) boulder[grade] = count;
    }
    return { boulder, routes: typeof data.routes === "number" ? data.routes : 0 };
  } catch {
    return { boulder: {}, routes: 0 };
  }
}

export function climbingTotal(s: ClimbingSummary): number {
  return Object.values(s.boulder).reduce((a, b) => a + b, 0) + s.routes;
}

// Grades sorted easiest -> hardest (numeric where possible).
export function sortedBoulderGrades(s: ClimbingSummary): [string, number][] {
  return Object.entries(s.boulder).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}
