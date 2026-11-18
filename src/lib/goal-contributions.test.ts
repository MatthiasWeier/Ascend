import { describe, it, expect, afterEach } from "vitest";
import {
  unitForExerciseType,
  goalUnitMatchesExerciseType,
  contributeWorkoutSetToGoals,
  contributeChallengeAttemptToGoals,
  backfillGoalFromHistory,
} from "@/lib/goal-contributions";
import {
  createTestUser,
  createTestExercise,
  createTestGroup,
  createSession,
  createSet,
  cleanupUser,
  cleanupExercise,
  cleanupGroup,
} from "@/lib/test-utils";
import { prisma } from "@/lib/prisma";

describe("unitForExerciseType / goalUnitMatchesExerciseType", () => {
  it("maps REPS exercises to a REPS goal and HOLD exercises to DURATION_SEC", () => {
    expect(unitForExerciseType("REPS")).toBe("REPS");
    expect(unitForExerciseType("HOLD")).toBe("DURATION_SEC");
  });

  it("matches only the corresponding unit", () => {
    expect(goalUnitMatchesExerciseType("REPS", "REPS")).toBe(true);
    expect(goalUnitMatchesExerciseType("DURATION_SEC", "HOLD")).toBe(true);
    expect(goalUnitMatchesExerciseType("REPS", "HOLD")).toBe(false);
    expect(goalUnitMatchesExerciseType("DURATION_SEC", "REPS")).toBe(false);
    expect(goalUnitMatchesExerciseType("KM", "REPS")).toBe(false);
  });
});

describe("contributeWorkoutSetToGoals / contributeChallengeAttemptToGoals / backfillGoalFromHistory", () => {
  let userId: string | null = null;
  let exerciseId: string | null = null;
  let groupId: string | null = null;

  afterEach(async () => {
    if (groupId) await cleanupGroup(groupId);
    if (userId) await cleanupUser(userId);
    if (exerciseId) await cleanupExercise(exerciseId);
    groupId = null;
    userId = null;
    exerciseId = null;
  });

  async function setupGoal(unit: "REPS" | "DURATION_SEC" = "REPS") {
    const user = await createTestUser();
    const exercise = await createTestExercise({ type: unit === "DURATION_SEC" ? "HOLD" : "REPS" });
    const group = await createTestGroup(user.id);
    userId = user.id;
    exerciseId = exercise.id;
    groupId = group.id;
    const goal = await prisma.groupGoal.create({
      data: {
        groupId: group.id,
        title: "Test Goal",
        unit,
        targetValue: 1000,
        createdById: user.id,
        exercises: { connect: { id: exercise.id } },
      },
    });
    return { user, exercise, group, goal };
  }

  it("contributes a workout set's reps to a linked REPS goal", async () => {
    const { user, exercise, goal } = await setupGoal("REPS");
    const session = await createSession(user.id, new Date());
    const set = await createSet(session.id, exercise.id, { reps: 12 });

    await contributeWorkoutSetToGoals({ userId: user.id, exerciseId: exercise.id, reps: 12, durationSec: null, workoutSetId: set.id });

    const contributions = await prisma.groupGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({ userId: user.id, amount: 12, source: "WORKOUT", sourceId: set.id });
  });

  it("is idempotent - calling it twice for the same set doesn't double-count", async () => {
    const { user, exercise, goal } = await setupGoal("REPS");
    const session = await createSession(user.id, new Date());
    const set = await createSet(session.id, exercise.id, { reps: 12 });

    const contribute = () =>
      contributeWorkoutSetToGoals({ userId: user.id, exerciseId: exercise.id, reps: 12, durationSec: null, workoutSetId: set.id });
    await contribute();
    await contribute();

    const contributions = await prisma.groupGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(contributions).toHaveLength(1);
  });

  it("does not contribute to a goal past its deadline", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise();
    const group = await createTestGroup(user.id);
    userId = user.id;
    exerciseId = exercise.id;
    groupId = group.id;
    const goal = await prisma.groupGoal.create({
      data: {
        groupId: group.id,
        title: "Expired Goal",
        unit: "REPS",
        targetValue: 1000,
        deadline: new Date("2020-01-01"),
        createdById: user.id,
        exercises: { connect: { id: exercise.id } },
      },
    });
    const session = await createSession(user.id, new Date());
    const set = await createSet(session.id, exercise.id, { reps: 12 });

    await contributeWorkoutSetToGoals({ userId: user.id, exerciseId: exercise.id, reps: 12, durationSec: null, workoutSetId: set.id });

    const contributions = await prisma.groupGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(contributions).toHaveLength(0);
  });

  it("does not contribute reps to a DURATION_SEC goal, or duration to a REPS goal", async () => {
    const { user, exercise, goal } = await setupGoal("DURATION_SEC");
    const session = await createSession(user.id, new Date());
    // Logged with reps but no durationSec - a DURATION_SEC goal needs durationSec.
    const set = await createSet(session.id, exercise.id, { reps: 12, durationSec: null });

    await contributeWorkoutSetToGoals({ userId: user.id, exerciseId: exercise.id, reps: 12, durationSec: null, workoutSetId: set.id });

    const contributions = await prisma.groupGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(contributions).toHaveLength(0);
  });

  it("contributes a completed challenge attempt's final reps to a linked REPS goal", async () => {
    const { user, exercise, group, goal } = await setupGoal("REPS");
    await contributeChallengeAttemptToGoals({
      attemptId: "fake-attempt-id",
      userId: user.id,
      groupId: group.id,
      exerciseId: exercise.id,
      finalReps: 42,
    });

    const contributions = await prisma.groupGoalContribution.findMany({ where: { goalId: goal.id } });
    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({ amount: 42, source: "CHALLENGE", sourceId: "fake-attempt-id" });
  });

  it("backfillGoalFromHistory picks up sets logged before the goal existed", async () => {
    const user = await createTestUser();
    const exercise = await createTestExercise();
    const group = await createTestGroup(user.id);
    userId = user.id;
    exerciseId = exercise.id;
    groupId = group.id;

    const session = await createSession(user.id, new Date("2026-01-01T12:00:00Z"));
    await createSet(session.id, exercise.id, { reps: 20 });
    await createSet(session.id, exercise.id, { reps: 30, order: 1 });

    const goal = await prisma.groupGoal.create({
      data: {
        groupId: group.id,
        title: "Backfilled Goal",
        unit: "REPS",
        targetValue: 1000,
        createdById: user.id,
        exercises: { connect: { id: exercise.id } },
      },
    });

    const count = await backfillGoalFromHistory({
      id: goal.id,
      groupId: group.id,
      exerciseIds: [exercise.id],
      unit: "REPS",
      startDate: null,
      deadline: null,
    });

    expect(count).toBe(2);
    const total = await prisma.groupGoalContribution.aggregate({ where: { goalId: goal.id }, _sum: { amount: true } });
    expect(total._sum.amount).toBe(50);
  });

  it("backfillGoalFromHistory returns 0 immediately when no exercises are linked", async () => {
    const count = await backfillGoalFromHistory({
      id: "irrelevant",
      groupId: "irrelevant",
      exerciseIds: [],
      unit: "REPS",
      startDate: null,
      deadline: null,
    });
    expect(count).toBe(0);
  });
});
