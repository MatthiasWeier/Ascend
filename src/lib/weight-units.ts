export type WeightUnit = "KG" | "LBS";

const KG_PER_LB = 0.45359237;

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

// Every weight is stored in kg (workout sets, bodyweight, CSV export/import,
// group post text). These only convert at the display boundary.
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "LBS" ? kgToLbs(kg) : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === "LBS" ? lbsToKg(value) : value;
}

// kg keeps one decimal (2.5kg plates); lbs rounds to a whole number - finer
// than that isn't meaningfully loadable on a barbell either way.
export function roundForDisplay(value: number, unit: WeightUnit): number {
  return unit === "LBS" ? Math.round(value) : Math.round(value * 10) / 10;
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  if (kg == null) return unit === "LBS" ? "0" : "0";
  return String(roundForDisplay(kgToDisplay(kg, unit), unit));
}

export function unitLabel(unit: WeightUnit): string {
  return unit === "LBS" ? "lbs" : "kg";
}
