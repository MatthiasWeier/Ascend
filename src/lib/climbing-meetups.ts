import type { ClimbingFocus } from "@prisma/client";

export const CLIMBING_FOCUSES: ClimbingFocus[] = ["SLAB", "POWER", "TECHNIK", "AUSDAUER", "KRAFT", "MENTAL"];

// German source text = i18n key.
export const CLIMBING_FOCUS_LABEL: Record<ClimbingFocus, string> = {
  SLAB: "Slab",
  POWER: "Power",
  TECHNIK: "Technik",
  AUSDAUER: "Ausdauer",
  KRAFT: "Kraft",
  MENTAL: "Mental",
};

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
