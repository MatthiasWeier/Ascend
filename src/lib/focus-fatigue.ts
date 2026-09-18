import { z } from "zod";
import type { MuscleFocus } from "@prisma/client";

export const focusFatigueSchema = z
  .array(z.object({ focus: z.enum(["PUSH", "PULL", "LEGS", "CORE", "GRIP"]), rating: z.number().int().min(1).max(10) }))
  .optional();

// The single per-session perceivedExertion column (overload detection,
// activity calendar) is derived from the per-focus ratings so there is one
// source of truth - falls back to a directly-submitted value for callers
// that don't send focusFatigue at all.
export function deriveOverallExertion(
  focusFatigue: { focus: MuscleFocus; rating: number }[] | undefined,
  fallback: number | undefined
): number | undefined {
  if (!focusFatigue || focusFatigue.length === 0) return fallback;
  const avg = focusFatigue.reduce((sum, f) => sum + f.rating, 0) / focusFatigue.length;
  return Math.round(avg);
}
