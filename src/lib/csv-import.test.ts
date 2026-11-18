import { describe, it, expect } from "vitest";
import { parseWorkoutCsv, guessFocus } from "@/lib/csv-import";

describe("parseWorkoutCsv", () => {
  it("parses a basic Strong-style export into one session with one exercise and two sets", () => {
    const csv =
      "Date,Workout Name,Exercise Name,Weight,Reps\n" +
      "2026-01-15 18:00:00,Push Day,Bench Press,80,8\n" +
      "2026-01-15 18:00:00,Push Day,Bench Press,82.5,6\n";

    const sessions = parseWorkoutCsv(csv);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].notes).toBe("Push Day");
    expect(sessions[0].exercises).toHaveLength(1);
    expect(sessions[0].exercises[0].name).toBe("Bench Press");
    expect(sessions[0].exercises[0].sets).toEqual([
      { reps: 8, weightKg: 80, durationSec: null, notes: null },
      { reps: 6, weightKg: 82.5, durationSec: null, notes: null },
    ]);
  });

  it("converts lbs to kg when the weight column header says lbs", () => {
    const csv = "Date,Exercise Name,Weight (lbs),Reps\n2026-01-15 18:00:00,Squat,225,5\n";
    const sessions = parseWorkoutCsv(csv);
    // 225 lbs * 0.453592 = 102.0582, rounded to 2 decimals.
    expect(sessions[0].exercises[0].sets[0].weightKg).toBe(102.06);
  });

  it("groups rows into separate sessions by (date-to-the-minute, workout name)", () => {
    const csv =
      "Date,Workout Name,Exercise Name,Weight,Reps\n" +
      "2026-01-15 18:00:00,Push Day,Bench Press,80,8\n" +
      "2026-01-16 18:00:00,Pull Day,Pull-ups,0,10\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions).toHaveLength(2);
    // Sorted chronologically.
    expect(sessions[0].notes).toBe("Push Day");
    expect(sessions[1].notes).toBe("Pull Day");
  });

  it("groups multiple exercises within the same session, preserving per-exercise sets", () => {
    const csv =
      "Date,Workout Name,Exercise Name,Weight,Reps\n" +
      "2026-01-15 18:00:00,Push Day,Bench Press,80,8\n" +
      "2026-01-15 18:00:00,Push Day,Overhead Press,40,10\n" +
      "2026-01-15 18:00:00,Push Day,Bench Press,82.5,6\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].exercises.map((e) => e.name)).toEqual(["Bench Press", "Overhead Press"]);
    expect(sessions[0].exercises[0].sets).toHaveLength(2);
    expect(sessions[0].exercises[1].sets).toHaveLength(1);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = 'Date,Exercise Name,Weight,Reps,Notes\n2026-01-15 18:00:00,Bench Press,80,8,"felt heavy, stopped early"\n';
    const sessions = parseWorkoutCsv(csv);
    expect(sessions[0].exercises[0].sets[0].notes).toBe("felt heavy, stopped early");
  });

  it("uses duration instead of reps for time-based sets", () => {
    const csv = "Date,Exercise Name,Seconds\n2026-01-15 18:00:00,Plank,45\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions[0].exercises[0].sets[0]).toEqual({ reps: null, weightKg: null, durationSec: 45, notes: null });
  });

  it("skips rows with an unparseable date", () => {
    const csv = "Date,Exercise Name,Reps\nnot-a-date,Bench Press,8\n2026-01-15 18:00:00,Squat,5\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].exercises[0].name).toBe("Squat");
  });

  it("skips adding a set when the row has neither reps nor duration (exercise entry still exists)", () => {
    const csv = "Date,Exercise Name,Weight,Reps\n2026-01-15 18:00:00,Bench Press,80,\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions[0].exercises).toHaveLength(1);
    expect(sessions[0].exercises[0].sets).toHaveLength(0);
  });

  it("returns an empty array for a header-only or empty file", () => {
    expect(parseWorkoutCsv("Date,Exercise Name,Reps\n")).toEqual([]);
    expect(parseWorkoutCsv("")).toEqual([]);
  });

  it("throws if the date or exercise column can't be found", () => {
    expect(() => parseWorkoutCsv("Foo,Bar\n1,2\n")).toThrow();
  });

  it("treats a zero or negative weight/reps as absent (bodyweight / invalid)", () => {
    const csv = "Date,Exercise Name,Weight,Reps\n2026-01-15 18:00:00,Push-ups,0,15\n";
    const sessions = parseWorkoutCsv(csv);
    expect(sessions[0].exercises[0].sets[0].weightKg).toBeNull();
    expect(sessions[0].exercises[0].sets[0].reps).toBe(15);
  });
});

describe("guessFocus", () => {
  it.each([
    ["Barbell Squat", "LEGS"],
    ["Romanian Deadlift", "LEGS"],
    ["Bent Over Row", "PULL"],
    ["Lat Pulldown", "PULL"],
    ["Bench Press", "PUSH"],
    ["Overhead Press", "PUSH"],
    ["Dead Hang", "GRIP"],
    ["Farmer Carry", "GRIP"],
    ["Cable Crunch", "CORE"],
    ["Plank", "CORE"],
  ])("guesses %s as %s", (name, expected) => {
    expect(guessFocus(name)).toBe(expected);
  });

  it("falls back to CORE for an unrecognized exercise name", () => {
    expect(guessFocus("Completely Unknown Movement")).toBe("CORE");
  });

  it("is case-insensitive", () => {
    expect(guessFocus("BENCH PRESS")).toBe("PUSH");
  });
});
