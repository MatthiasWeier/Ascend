import type { Muscle, MuscleFocus } from "@prisma/client";

// Fine-grained muscle groups (the old MuscleFocus stays as the coarse
// Push/Pull/Legs/Core/Grip bucket). Every exercise maps onto these with a
// primary/secondary role - see DEFAULT_EXERCISE_MUSCLES.
export const ALL_MUSCLES: Muscle[] = [
  "CHEST",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "LATS",
  "UPPER_BACK",
  "LOWER_BACK",
  "ABS",
  "OBLIQUES",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
];

// German source text = i18n key.
export const MUSCLE_LABEL: Record<Muscle, string> = {
  CHEST: "Chest",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  FOREARMS: "Forearms",
  LATS: "Lats",
  UPPER_BACK: "Upper back",
  LOWER_BACK: "Lower back",
  ABS: "Abs",
  OBLIQUES: "Obliques",
  GLUTES: "Glutes",
  QUADS: "Quads",
  HAMSTRINGS: "Hamstrings",
  CALVES: "Calves",
};

// The coarse bucket a muscle belongs to - lets muscle-level wishes steer the
// focus-based Workout Brain.
export const MUSCLE_FOCUS: Record<Muscle, MuscleFocus> = {
  CHEST: "PUSH",
  SHOULDERS: "PUSH",
  TRICEPS: "PUSH",
  BICEPS: "PULL",
  LATS: "PULL",
  UPPER_BACK: "PULL",
  LOWER_BACK: "PULL",
  FOREARMS: "GRIP",
  ABS: "CORE",
  OBLIQUES: "CORE",
  GLUTES: "LEGS",
  QUADS: "LEGS",
  HAMSTRINGS: "LEGS",
  CALVES: "LEGS",
};

export type MuscleRoleName = "PRIMARY" | "SECONDARY";
export type ExerciseMuscleRow = { muscle: Muscle; role: MuscleRoleName };

// Used for exercises without an explicit mapping (custom exercises created
// before muscles existed): a sensible guess from the coarse focus.
const FALLBACK_BY_FOCUS: Record<MuscleFocus, ExerciseMuscleRow[]> = {
  PUSH: [
    { muscle: "CHEST", role: "PRIMARY" },
    { muscle: "TRICEPS", role: "SECONDARY" },
    { muscle: "SHOULDERS", role: "SECONDARY" },
  ],
  PULL: [
    { muscle: "LATS", role: "PRIMARY" },
    { muscle: "BICEPS", role: "SECONDARY" },
    { muscle: "UPPER_BACK", role: "SECONDARY" },
  ],
  LEGS: [
    { muscle: "QUADS", role: "PRIMARY" },
    { muscle: "GLUTES", role: "PRIMARY" },
    { muscle: "HAMSTRINGS", role: "SECONDARY" },
  ],
  CORE: [{ muscle: "ABS", role: "PRIMARY" }],
  GRIP: [{ muscle: "FOREARMS", role: "PRIMARY" }],
};

export function resolveExerciseMuscles(focus: MuscleFocus, rows: ExerciseMuscleRow[]): ExerciseMuscleRow[] {
  return rows.length > 0 ? rows : FALLBACK_BY_FOCUS[focus];
}

export const ROLE_WEIGHT: Record<MuscleRoleName, number> = { PRIMARY: 1, SECONDARY: 0.5 };

type M = Muscle;
// name -> [primary, secondary]
export const DEFAULT_EXERCISE_MUSCLES: Record<string, [M[], M[]]> = {
  "Bench Press": [["CHEST"], ["TRICEPS", "SHOULDERS"]],
  "Incline Bench Press": [["CHEST", "SHOULDERS"], ["TRICEPS"]],
  "Close-Grip Bench Press": [["TRICEPS"], ["CHEST", "SHOULDERS"]],
  "Overhead Press": [["SHOULDERS"], ["TRICEPS", "UPPER_BACK"]],
  "Shoulder Press (Machine)": [["SHOULDERS"], ["TRICEPS"]],
  "Chest Press (Machine)": [["CHEST"], ["TRICEPS", "SHOULDERS"]],
  "Push-ups": [["CHEST"], ["TRICEPS", "SHOULDERS", "ABS"]],
  "Diamond Push-ups": [["TRICEPS"], ["CHEST", "SHOULDERS"]],
  "Archer Push-ups": [["CHEST"], ["TRICEPS", "SHOULDERS"]],
  "Pike Push-ups": [["SHOULDERS"], ["TRICEPS"]],
  "Handstand Push-ups": [["SHOULDERS"], ["TRICEPS", "ABS"]],
  "Dips": [["TRICEPS", "CHEST"], ["SHOULDERS"]],

  "Pull-ups": [["LATS"], ["BICEPS", "UPPER_BACK", "FOREARMS"]],
  "Chin-ups": [["LATS", "BICEPS"], ["UPPER_BACK", "FOREARMS"]],
  "Wide Grip Pull-ups": [["LATS"], ["UPPER_BACK", "BICEPS"]],
  "Muscle-ups": [["LATS", "TRICEPS"], ["CHEST", "BICEPS", "SHOULDERS"]],
  "Inverted Rows": [["UPPER_BACK", "LATS"], ["BICEPS", "FOREARMS"]],
  "Barbell Row": [["LATS", "UPPER_BACK"], ["BICEPS", "LOWER_BACK"]],
  "Lat Pulldown": [["LATS"], ["BICEPS"]],
  "Seated Cable Row": [["UPPER_BACK", "LATS"], ["BICEPS"]],
  "Face Pulls": [["UPPER_BACK", "SHOULDERS"], []],
  "Bicep Curls": [["BICEPS"], ["FOREARMS"]],
  "Hammer Curls": [["BICEPS", "FOREARMS"], []],

  "Squat": [["QUADS", "GLUTES"], ["HAMSTRINGS", "LOWER_BACK", "ABS"]],
  "Front Squat": [["QUADS"], ["GLUTES", "ABS"]],
  "Bodyweight Squats": [["QUADS"], ["GLUTES"]],
  "Pistol Squat": [["QUADS", "GLUTES"], ["HAMSTRINGS", "CALVES"]],
  "Deadlift": [["HAMSTRINGS", "GLUTES", "LOWER_BACK"], ["QUADS", "UPPER_BACK", "FOREARMS"]],
  "Romanian Deadlift": [["HAMSTRINGS", "GLUTES"], ["LOWER_BACK"]],
  "Leg Press": [["QUADS"], ["GLUTES"]],
  "Bulgarian Split Squat": [["QUADS", "GLUTES"], ["HAMSTRINGS"]],
  "Lunges": [["QUADS", "GLUTES"], ["HAMSTRINGS"]],
  "Step-ups": [["QUADS", "GLUTES"], []],
  "Hip Thrust": [["GLUTES"], ["HAMSTRINGS"]],
  "Calf Raises": [["CALVES"], []],
  "Nordic Curl": [["HAMSTRINGS"], []],
  "Box Jumps": [["QUADS", "GLUTES"], ["CALVES"]],

  "Sit-ups": [["ABS"], []],
  "Hanging Leg Raise": [["ABS"], ["FOREARMS"]],
  "Russian Twists": [["OBLIQUES"], ["ABS"]],
  "Ab Wheel Rollout": [["ABS"], ["SHOULDERS", "LATS"]],
  "Mountain Climbers": [["ABS"], ["SHOULDERS", "QUADS"]],
  "Burpees": [["CHEST", "QUADS"], ["TRICEPS", "SHOULDERS", "ABS"]],
  "Plank": [["ABS"], ["SHOULDERS", "GLUTES"]],
  "Side Plank": [["OBLIQUES"], ["ABS", "SHOULDERS"]],
  "Front Lever": [["ABS", "LATS"], ["SHOULDERS", "FOREARMS"]],
  "Hollow Body Hold": [["ABS"], []],
  "L-Sit": [["ABS"], ["TRICEPS", "QUADS"]],

  "Dead Hang": [["FOREARMS"], ["LATS", "SHOULDERS"]],
  "Fingerboard Hang": [["FOREARMS"], ["LATS"]],
  "Farmer's Carry": [["FOREARMS"], ["UPPER_BACK", "ABS"]],
  "Plate Pinch": [["FOREARMS"], []],
  "Wrist Curls": [["FOREARMS"], []],

  "Running": [["QUADS", "HAMSTRINGS"], ["CALVES", "GLUTES"]],
  "Cycling": [["QUADS"], ["HAMSTRINGS", "CALVES", "GLUTES"]],
  "Jump Rope": [["CALVES", "QUADS"], ["SHOULDERS", "ABS"]],
  "Rowing (Machine)": [["LATS", "QUADS"], ["UPPER_BACK", "HAMSTRINGS", "BICEPS", "GLUTES"]],
  "Swimming (Freestyle)": [["LATS", "SHOULDERS"], ["TRICEPS", "ABS", "QUADS"]],
  "Swimming (Backstroke)": [["LATS", "SHOULDERS"], ["TRICEPS", "ABS", "QUADS"]],
  "Swimming (Breaststroke)": [["QUADS", "CHEST"], ["HAMSTRINGS", "GLUTES", "TRICEPS", "SHOULDERS"]],
  "Swimming (Butterfly)": [["ABS", "LATS"], ["SHOULDERS", "CHEST", "QUADS"]],
};

export function defaultMuscleRows(name: string): ExerciseMuscleRow[] | null {
  const entry = DEFAULT_EXERCISE_MUSCLES[name];
  if (!entry) return null;
  return [
    ...entry[0].map((muscle) => ({ muscle, role: "PRIMARY" as const })),
    ...entry[1].map((muscle) => ({ muscle, role: "SECONDARY" as const })),
  ];
}
