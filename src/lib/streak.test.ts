import { describe, it, expect, afterEach } from "vitest";
import { computeCurrentStreak } from "@/lib/streak";
import { createTestUser, createSession, cleanupUser } from "@/lib/test-utils";
import { addDaysToDateKey, todayGermanDateKey } from "@/lib/german-time";

function dateForOffset(daysAgo: number): Date {
  const key = addDaysToDateKey(todayGermanDateKey(), -daysAgo);
  return new Date(`${key}T12:00:00.000Z`);
}

let userId: string | null = null;
afterEach(async () => {
  if (userId) await cleanupUser(userId);
  userId = null;
});

describe("computeCurrentStreak", () => {
  it("is 0 for a user with no workouts", async () => {
    const user = await createTestUser();
    userId = user.id;
    expect(await computeCurrentStreak(user.id)).toBe(0);
  });

  it("counts consecutive days including today", async () => {
    const user = await createTestUser();
    userId = user.id;
    await createSession(user.id, dateForOffset(0));
    await createSession(user.id, dateForOffset(1));
    await createSession(user.id, dateForOffset(2));
    expect(await computeCurrentStreak(user.id)).toBe(3);
  });

  it("stops at the first gap", async () => {
    const user = await createTestUser();
    userId = user.id;
    await createSession(user.id, dateForOffset(0));
    await createSession(user.id, dateForOffset(1));
    // gap at day 2
    await createSession(user.id, dateForOffset(3));
    expect(await computeCurrentStreak(user.id)).toBe(2);
  });

  it("doesn't break the streak just because today has no workout yet", async () => {
    const user = await createTestUser();
    userId = user.id;
    await createSession(user.id, dateForOffset(1));
    await createSession(user.id, dateForOffset(2));
    // No session today - streak should count from yesterday instead of 0.
    expect(await computeCurrentStreak(user.id)).toBe(2);
  });

  it("is 0 if neither today nor yesterday has a workout, even with older ones", async () => {
    const user = await createTestUser();
    userId = user.id;
    await createSession(user.id, dateForOffset(3));
    await createSession(user.id, dateForOffset(4));
    expect(await computeCurrentStreak(user.id)).toBe(0);
  });

  it("counts multiple sessions on the same day as one streak day", async () => {
    const user = await createTestUser();
    userId = user.id;
    await createSession(user.id, dateForOffset(0));
    await createSession(user.id, dateForOffset(0));
    await createSession(user.id, dateForOffset(1));
    expect(await computeCurrentStreak(user.id)).toBe(2);
  });
});
