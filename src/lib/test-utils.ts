import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { MuscleFocus, ExerciseType } from "@prisma/client";

// Shared helpers for tests that need real rows in the ascend_test database
// (DATABASE_URL is pointed there by the "test" script in package.json).
// Not matched by vitest's "src/**/*.test.ts" include pattern, so this file
// itself is never run as a test suite.

export async function createTestUser(
  overrides: Partial<{ name: string; username: string; bodyWeightKg: number; isAdmin: boolean }> = {}
) {
  const id = randomUUID();
  return prisma.user.create({
    data: {
      username: overrides.username ?? `test_${id}`,
      name: overrides.name ?? "Test User",
      passwordHash: "x",
      bodyWeightKg: overrides.bodyWeightKg,
      isAdmin: overrides.isAdmin ?? false,
    },
  });
}

export async function createTestExercise(
  overrides: Partial<{ type: ExerciseType; focus: MuscleFocus; isBodyweight: boolean }> = {}
) {
  return prisma.exercise.create({
    data: {
      name: `Test Exercise ${randomUUID()}`,
      type: overrides.type ?? "REPS",
      focus: overrides.focus ?? "PUSH",
      isBodyweight: overrides.isBodyweight ?? false,
      isDefault: false,
    },
  });
}

export async function createTestGroup(ownerId: string) {
  return prisma.group.create({
    data: {
      name: `Test Group ${randomUUID()}`,
      ownerId,
      members: { create: { userId: ownerId, role: "LEADER" } },
    },
  });
}

export async function addGroupMember(groupId: string, userId: string) {
  return prisma.groupMember.create({ data: { groupId, userId, role: "MEMBER" } });
}

export async function createSession(userId: string, date: Date) {
  return prisma.workoutSession.create({ data: { userId, date } });
}

export async function createSet(
  sessionId: string,
  exerciseId: string,
  overrides: Partial<{ reps: number | null; weightKg: number | null; durationSec: number | null; setType: "WARMUP" | "NORMAL" | "DROP" | "FAILURE"; order: number }> = {}
) {
  return prisma.workoutSet.create({
    data: {
      sessionId,
      exerciseId,
      order: overrides.order ?? 0,
      reps: overrides.reps,
      weightKg: overrides.weightKg,
      durationSec: overrides.durationSec,
      setType: overrides.setType ?? "NORMAL",
    },
  });
}

// Deletes everything created for a user in a test - cascades cover
// sessions/sets/group memberships/etc. Exercises and groups created
// independently of a user need their own cleanup (see below).
export async function cleanupUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

export async function cleanupExercise(exerciseId: string) {
  await prisma.exercise.delete({ where: { id: exerciseId } }).catch(() => {});
}

export async function cleanupGroup(groupId: string) {
  await prisma.group.delete({ where: { id: groupId } }).catch(() => {});
}
