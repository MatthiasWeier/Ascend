import type { BodyPart, InjurySeverity, Muscle, MuscleFocus } from "@prisma/client";
import { resolveExerciseMuscles, type ExerciseMuscleRow } from "@/lib/muscles";

// Pure helpers shared by server and client (no prisma import).

export const BODY_PARTS: BodyPart[] = [
  "NECK",
  "SHOULDER",
  "ELBOW",
  "FOREARM",
  "WRIST",
  "FINGERS",
  "CHEST",
  "UPPER_BACK",
  "LOWER_BACK",
  "HIP",
  "KNEE",
  "ANKLE",
];

// German source text = i18n key.
export const BODY_PART_LABEL: Record<BodyPart, string> = {
  NECK: "Nacken",
  SHOULDER: "Schulter",
  ELBOW: "Ellbogen",
  FOREARM: "Unterarm",
  WRIST: "Handgelenk",
  FINGERS: "Finger",
  CHEST: "Brust",
  UPPER_BACK: "Oberer Rücken",
  LOWER_BACK: "Unterer Rücken",
  HIP: "Hüfte",
  KNEE: "Knie",
  ANKLE: "Sprunggelenk/Fuß",
};

export const SEVERITIES: InjurySeverity[] = ["MILD", "MODERATE", "SEVERE"];
export const SEVERITY_LABEL: Record<InjurySeverity, string> = {
  MILD: "Leicht",
  MODERATE: "Mittel",
  SEVERE: "Schwer",
};

// Mild = only a warning while logging; moderate/severe additionally take the
// affected exercises out of the Workout Brain's suggestions.
export function blocksSuggestions(severity: InjurySeverity): boolean {
  return severity !== "MILD";
}

// Which body parts a working muscle loads.
export const MUSCLE_BODY_PARTS: Record<Muscle, BodyPart[]> = {
  CHEST: ["CHEST", "SHOULDER"],
  SHOULDERS: ["SHOULDER"],
  BICEPS: ["ELBOW"],
  TRICEPS: ["ELBOW"],
  FOREARMS: ["FOREARM", "WRIST", "FINGERS"],
  LATS: ["SHOULDER"],
  UPPER_BACK: ["UPPER_BACK", "NECK"],
  LOWER_BACK: ["LOWER_BACK"],
  ABS: [],
  OBLIQUES: [],
  GLUTES: ["HIP"],
  QUADS: ["KNEE"],
  HAMSTRINGS: ["KNEE", "HIP"],
  CALVES: ["ANKLE"],
};

// Joint loads the muscle map can't express (wrists in every support/push-up).
const EXTRA_PARTS: Record<string, BodyPart[]> = {
  "Push-ups": ["WRIST"],
  "Diamond Push-ups": ["WRIST"],
  "Archer Push-ups": ["WRIST"],
  "Pike Push-ups": ["WRIST"],
  "Handstand Push-ups": ["WRIST", "NECK"],
  "Dips": ["WRIST"],
  "Plank": ["WRIST"],
  "Side Plank": ["WRIST"],
  "Mountain Climbers": ["WRIST"],
  "Burpees": ["WRIST", "KNEE"],
  "L-Sit": ["WRIST"],
  "Ab Wheel Rollout": ["WRIST"],
  "Fingerboard Hang": ["FINGERS", "SHOULDER"],
  "Squat": ["LOWER_BACK", "ANKLE"],
  "Front Squat": ["WRIST", "ANKLE"],
  "Deadlift": ["LOWER_BACK"],
  "Box Jumps": ["ANKLE"],
};

// Every body part an exercise puts load on: from its muscles (primary and
// secondary) plus the extras above.
export function exerciseLoadedParts(name: string, focus: MuscleFocus, muscles: ExerciseMuscleRow[]): BodyPart[] {
  const parts = new Set<BodyPart>(EXTRA_PARTS[name] ?? []);
  for (const { muscle } of resolveExerciseMuscles(focus, muscles)) {
    for (const p of MUSCLE_BODY_PARTS[muscle]) parts.add(p);
  }
  return Array.from(parts);
}

export type ActiveInjury = { id: string; bodyPart: BodyPart; severity: InjurySeverity };

// Injuries whose body part the exercise loads.
export function injuryConflicts<T extends { bodyPart: BodyPart }>(loaded: BodyPart[], injuries: T[]): T[] {
  return injuries.filter((i) => loaded.includes(i.bodyPart));
}
