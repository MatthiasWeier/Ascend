import type { WeightUnit } from "@/lib/weight-units";

export const DEFAULT_BAR_KG = 20;
export const DEFAULT_BAR_LBS = 45;
export const AVAILABLE_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
export const AVAILABLE_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

export function defaultBarWeight(unit: WeightUnit): number {
  return unit === "LBS" ? DEFAULT_BAR_LBS : DEFAULT_BAR_KG;
}

// Greedily fills one side of the bar with the largest plates first -
// standard gym-plate assumption (each size available as many times as
// needed). `remainder` is what's left over if the target can't be hit
// exactly with this plate set (e.g. an odd target). Operates in whatever
// unit `bar`/`target` are given in - kg and lbs use different standard
// plate sets, so the unit must be passed explicitly rather than converted.
export function computePlatesPerSide(
  target: number,
  bar: number,
  unit: WeightUnit = "KG"
): { plates: number[]; remainder: number; barOnly: boolean } {
  const perSideTarget = (target - bar) / 2;
  if (perSideTarget <= 0) {
    return { plates: [], remainder: 0, barOnly: true };
  }

  const availablePlates = unit === "LBS" ? AVAILABLE_PLATES_LBS : AVAILABLE_PLATES_KG;
  const plates: number[] = [];
  let remaining = perSideTarget;
  for (const plate of availablePlates) {
    while (remaining + 1e-9 >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return { plates, remainder: Math.round(remaining * 100) / 100, barOnly: false };
}
