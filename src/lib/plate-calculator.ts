export const DEFAULT_BAR_KG = 20;
export const AVAILABLE_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

// Greedily fills one side of the bar with the largest plates first -
// standard gym-plate assumption (each size available as many times as
// needed). remainderKg is what's left over if the target can't be hit
// exactly with this plate set (e.g. an odd 0.5kg target).
export function computePlatesPerSide(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG
): { plates: number[]; remainderKg: number; barOnly: boolean } {
  const perSideTarget = (targetKg - barKg) / 2;
  if (perSideTarget <= 0) {
    return { plates: [], remainderKg: 0, barOnly: true };
  }

  const plates: number[] = [];
  let remaining = perSideTarget;
  for (const plate of AVAILABLE_PLATES_KG) {
    while (remaining + 1e-9 >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return { plates, remainderKg: Math.round(remaining * 100) / 100, barOnly: false };
}
