import type { Muscle } from "@prisma/client";

// A hand-built mannequin: every body part is an ellipsoid. Units are metres,
// y is up, the figure faces +z. `mirror` adds the left twin (x -> -x).
// Muscles sit slightly proud of the skin ellipsoids so they read as
// colourable patches from the front and back.
export type Blob = {
  id: string;
  muscle?: Muscle;
  pos: [number, number, number];
  radii: [number, number, number];
  mirror?: boolean;
};

export const SKIN: Blob[] = [
  { id: "head", pos: [0, 1.7, 0.0], radii: [0.095, 0.115, 0.105] },
  { id: "neck", pos: [0, 1.55, 0], radii: [0.05, 0.065, 0.05] },
  { id: "torso-upper", pos: [0, 1.3, 0], radii: [0.17, 0.16, 0.1] },
  { id: "torso-mid", pos: [0, 1.14, 0], radii: [0.145, 0.14, 0.09] },
  { id: "pelvis", pos: [0, 0.96, 0], radii: [0.15, 0.1, 0.09] },
  { id: "shoulder", pos: [0.19, 1.4, 0], radii: [0.055, 0.055, 0.055], mirror: true },
  { id: "upper-arm", pos: [0.228, 1.2, 0], radii: [0.045, 0.125, 0.045], mirror: true },
  { id: "elbow", pos: [0.238, 1.08, 0], radii: [0.042, 0.042, 0.042], mirror: true },
  { id: "forearm", pos: [0.25, 0.965, 0], radii: [0.04, 0.125, 0.04], mirror: true },
  { id: "hand", pos: [0.262, 0.8, 0.01], radii: [0.035, 0.06, 0.022], mirror: true },
  { id: "thigh", pos: [0.09, 0.7, 0], radii: [0.078, 0.21, 0.078], mirror: true },
  { id: "knee", pos: [0.09, 0.49, 0.005], radii: [0.055, 0.055, 0.055], mirror: true },
  { id: "shin", pos: [0.09, 0.29, 0], radii: [0.05, 0.2, 0.05], mirror: true },
  { id: "foot", pos: [0.09, 0.05, 0.05], radii: [0.04, 0.035, 0.09], mirror: true },
];

export const MUSCLE_BLOBS: (Blob & { muscle: Muscle })[] = [
  { id: "chest", muscle: "CHEST", pos: [0.085, 1.32, 0.085], radii: [0.085, 0.06, 0.05], mirror: true },
  { id: "shoulders", muscle: "SHOULDERS", pos: [0.2, 1.4, 0], radii: [0.065, 0.07, 0.065], mirror: true },
  { id: "biceps", muscle: "BICEPS", pos: [0.228, 1.2, 0.03], radii: [0.038, 0.09, 0.038], mirror: true },
  { id: "triceps", muscle: "TRICEPS", pos: [0.228, 1.2, -0.03], radii: [0.038, 0.09, 0.036], mirror: true },
  { id: "forearms", muscle: "FOREARMS", pos: [0.25, 0.965, 0], radii: [0.047, 0.125, 0.047], mirror: true },
  { id: "lats", muscle: "LATS", pos: [0.105, 1.22, -0.075], radii: [0.075, 0.12, 0.045], mirror: true },
  { id: "upper-back", muscle: "UPPER_BACK", pos: [0, 1.38, -0.085], radii: [0.15, 0.075, 0.04] },
  { id: "lower-back", muscle: "LOWER_BACK", pos: [0, 1.05, -0.075], radii: [0.11, 0.075, 0.04] },
  { id: "abs", muscle: "ABS", pos: [0, 1.13, 0.088], radii: [0.075, 0.115, 0.035] },
  { id: "obliques", muscle: "OBLIQUES", pos: [0.13, 1.1, 0.04], radii: [0.04, 0.095, 0.05], mirror: true },
  { id: "glutes", muscle: "GLUTES", pos: [0.075, 0.94, -0.075], radii: [0.08, 0.085, 0.065], mirror: true },
  { id: "quads", muscle: "QUADS", pos: [0.09, 0.7, 0.035], radii: [0.07, 0.18, 0.065], mirror: true },
  { id: "hamstrings", muscle: "HAMSTRINGS", pos: [0.09, 0.7, -0.04], radii: [0.065, 0.17, 0.05], mirror: true },
  { id: "calves", muscle: "CALVES", pos: [0.09, 0.29, -0.03], radii: [0.05, 0.13, 0.05], mirror: true },
];

// Heat levels 1 (barely trained, grey) .. 5 (heavily trained, red), from
// weighted working sets per week: primary sets count 1, secondary 0.5.
export const HEAT_COLORS = ["#5e5e66", "#a0706e", "#c85a58", "#e23e3e", "#ff2230"];
export const HEAT_THRESHOLDS = [0.01, 4, 8, 12]; // per-week load: >0 -> 2, >=4 -> 3, ...

export function heatLevel(perWeek: number): 1 | 2 | 3 | 4 | 5 {
  if (perWeek >= HEAT_THRESHOLDS[3]) return 5;
  if (perWeek >= HEAT_THRESHOLDS[2]) return 4;
  if (perWeek >= HEAT_THRESHOLDS[1]) return 3;
  if (perWeek >= HEAT_THRESHOLDS[0]) return 2;
  return 1;
}
