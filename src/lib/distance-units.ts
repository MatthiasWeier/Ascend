export type DistanceUnit = "KM" | "MI";

const KM_PER_MI = 1.609344;

export function kmToMi(km: number): number {
  return km / KM_PER_MI;
}

export function miToKm(mi: number): number {
  return mi * KM_PER_MI;
}

// Every distance is stored in meters (WorkoutSet.distanceMeters). These
// only convert at the display boundary - same pattern as weight-units.ts,
// just derived from the same KG/LBS preference rather than a separate
// setting (LBS users see miles, KG users see km).
export function metersToDisplay(meters: number, unit: DistanceUnit): number {
  const km = meters / 1000;
  return unit === "MI" ? kmToMi(km) : km;
}

export function displayToMeters(value: number, unit: DistanceUnit): number {
  const km = unit === "MI" ? miToKm(value) : value;
  return km * 1000;
}

export function roundForDisplay(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatDistance(meters: number | null | undefined, unit: DistanceUnit): string {
  if (meters == null) return "0";
  return String(roundForDisplay(metersToDisplay(meters, unit)));
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "MI" ? "mi" : "km";
}
