import { randomUUID } from "node:crypto";
import { describe, it, expect, afterEach } from "vitest";
import { computePrSetIds, getCurrentPRs } from "@/lib/personal-records";
import {
  createTestUser,
  createTestExercise,
  createSession,
  createSet,
  cleanupUser,
  cleanupExercise,
} from "@/lib/test-utils";
import { prisma } from "@/lib/prisma";

let userId: string | null = null;
let exerciseId: string | null = null;
afterEach(async () => {
  if (userId) await cleanupUser(userId);
  if (exerciseId) await cleanupExercise(exerciseId);
  userId = null;
  exerciseId = null;
});

describe("computePrSetIds / getCurrentPRs", () => {
  it("doesn't mark the very first logged set as a PR", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise();
    userId = user.id;
    exerciseId = exercise.id;

    const session = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    const set = await createSet(session.id, exercise.id, { reps: 10, weightKg: 50 });

    const prIds = await computePrSetIds(user.id);
    expect(prIds.has(set.id)).toBe(false);
  });

  it("marks a later set as a PR only when it strictly beats the previous best", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise();
    userId = user.id;
    exerciseId = exercise.id;

    const session1 = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    const set1 = await createSet(session1.id, exercise.id, { reps: 10, weightKg: 50 }); // Epley: 50*(1+10/30) = 66.67

    const session2 = await createSession(user.id, new Date("2026-01-02T12:00:00Z"));
    const set2 = await createSet(session2.id, exercise.id, { reps: 10, weightKg: 60 }); // 60*1.333 = 80 - beats set1

    const session3 = await createSession(user.id, new Date("2026-01-03T12:00:00Z"));
    const set3 = await createSet(session3.id, exercise.id, { reps: 5, weightKg: 40 }); // 40*(1+5/30) = 46.67 - doesn't beat set2

    const prIds = await computePrSetIds(user.id);
    expect(prIds.has(set1.id)).toBe(false);
    expect(prIds.has(set2.id)).toBe(true);
    expect(prIds.has(set3.id)).toBe(false);

    const current = await getCurrentPRs(user.id);
    const pr = current.find((p) => p.exerciseId === exercise.id);
    expect(pr).toBeDefined();
    expect(pr!.bestValue).toBeCloseTo(80, 1);
    expect(pr!.achievedAt.toISOString().slice(0, 10)).toBe("2026-01-02");
  });

  it("excludes WARMUP sets from PR consideration", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise();
    userId = user.id;
    exerciseId = exercise.id;

    const session1 = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    await createSet(session1.id, exercise.id, { reps: 5, weightKg: 20 });

    const session2 = await createSession(user.id, new Date("2026-01-02T12:00:00Z"));
    // A huge warmup weight should NOT count as the new best.
    await createSet(session2.id, exercise.id, { reps: 5, weightKg: 1000, setType: "WARMUP" });

    const current = await getCurrentPRs(user.id);
    const pr = current.find((p) => p.exerciseId === exercise.id);
    expect(pr!.achievedAt.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("ranks a HOLD exercise by duration, scaled up by any load", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise({ type: "HOLD" });
    userId = user.id;
    exerciseId = exercise.id;

    const session1 = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    await createSet(session1.id, exercise.id, { durationSec: 30, weightKg: 0 });

    const session2 = await createSession(user.id, new Date("2026-01-02T12:00:00Z"));
    // Shorter hold, but loaded - should still count toward a higher value if the load factor pushes it past 30.
    const set2 = await createSet(session2.id, exercise.id, { durationSec: 25, weightKg: 50 }); // 25*(1+50/50)=50

    const prIds = await computePrSetIds(user.id);
    expect(prIds.has(set2.id)).toBe(true);
  });

  it("folds resolved bodyweight into the load for a bodyweight exercise", async () => {
    const user = await createTestUser({ bodyWeightKg: 80 });
    const exercise = await createTestExercise({ isBodyweight: true });
    userId = user.id;
    exerciseId = exercise.id;

    // No BodyWeightEntry history - makeBodyWeightResolver falls back to
    // the user's cached bodyWeightKg (80) for every date.
    const session1 = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    const set1 = await createSet(session1.id, exercise.id, { reps: 10, weightKg: null }); // load = 80, value = 80*(1+10/30)=106.67

    const session2 = await createSession(user.id, new Date("2026-01-02T12:00:00Z"));
    const set2 = await createSet(session2.id, exercise.id, { reps: 10, weightKg: 5 }); // load = 85, value = 85*1.333=113.3 - beats set1

    const prIds = await computePrSetIds(user.id);
    expect(prIds.has(set1.id)).toBe(false);
    expect(prIds.has(set2.id)).toBe(true);
  });

  it("getCurrentPRs sorts by exercise name", async () => {
    const user = await createTestUser();
    userId = user.id;
    const suffix = randomUUID();
    const nameA = `AAA Test Exercise A ${suffix}`;
    const nameB = `ZZZ Test Exercise B ${suffix}`;
    const exerciseB = await prisma.exercise.create({
      data: { name: nameB, type: "REPS", focus: "PUSH", isDefault: false },
    });
    const exerciseA = await prisma.exercise.create({
      data: { name: nameA, type: "REPS", focus: "PUSH", isDefault: false },
    });
    const session = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    await createSet(session.id, exerciseB.id, { reps: 5, weightKg: 10 });
    await createSet(session.id, exerciseA.id, { reps: 5, weightKg: 10 });

    try {
      const current = await getCurrentPRs(user.id);
      const names = current.map((p) => p.exerciseName);
      expect(names.indexOf(nameA)).toBeLessThan(names.indexOf(nameB));
    } finally {
      await prisma.exercise.delete({ where: { id: exerciseA.id } }).catch(() => {});
      await prisma.exercise.delete({ where: { id: exerciseB.id } }).catch(() => {});
    }
  });
});
