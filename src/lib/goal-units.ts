// Pure constants/helpers for GoalUnit - zero server imports (no Prisma
// client), safe to import from both server and "use client" components.
// See lib/muscle-focus.ts for why that separation matters here.

export const GOAL_UNITS = ["REPS", "DURATION_SEC", "KM", "CUSTOM"] as const;
export type GoalUnitValue = (typeof GOAL_UNITS)[number];

export const GOAL_UNIT_LABEL: Record<GoalUnitValue, string> = {
  REPS: "Wiederholungen",
  DURATION_SEC: "Sekunden",
  KM: "km",
  CUSTOM: "Custom",
};

export function formatGoalUnit(unit: GoalUnitValue, customUnitLabel?: string | null): string {
  if (unit === "CUSTOM") return customUnitLabel?.trim() || "Custom";
  return GOAL_UNIT_LABEL[unit];
}
