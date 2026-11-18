// Integration tests proving (not just asserting from reading the code)
// that authorization actually holds across the different resource-access
// patterns used in this app: personal ownership, group membership, group
// LEADER role, API-key auth, challenge-attempt ownership, and admin-only.
// One representative route per pattern, per docs/ANALYSIS.md's "no real
// IDOR found" conclusion from the Phase 1 review - this is what proves it
// instead of just claiming it. Route handlers are imported and invoked
// directly (not over HTTP) against the real ascend_test database, with
// auth() mocked to return a controlled session per call.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createTestUser,
  createTestExercise,
  createTestGroup,
  addGroupMember,
  createSession as createWorkoutSession,
  cleanupUser,
  cleanupExercise,
  cleanupGroup,
} from "@/lib/test-utils";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key-auth";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/lib/auth";
const mockAuth = vi.mocked(auth);

function sessionFor(userId: string) {
  return { user: { id: userId } } as unknown as Awaited<ReturnType<typeof auth>>;
}

const cleanupUsers: string[] = [];
const cleanupExercises: string[] = [];
const cleanupGroups: string[] = [];
const cleanupTemplates: string[] = [];
afterEach(async () => {
  // Groups first - cascades away any GroupDailyChallenge, which is what a
  // ChallengeTemplate's own FK blocks on, which is in turn what an
  // Exercise's FK blocks on. Deleting in the wrong order here silently
  // leaves rows behind (each delete below is itself best-effort/.catch),
  // which happened the first time this file didn't order it this way -
  // keep this order rather than "simplifying" it.
  for (const id of cleanupGroups.splice(0)) await cleanupGroup(id);
  for (const id of cleanupTemplates.splice(0)) await prisma.challengeTemplate.delete({ where: { id } }).catch(() => {});
  for (const id of cleanupUsers.splice(0)) await cleanupUser(id);
  for (const id of cleanupExercises.splice(0)) await cleanupExercise(id);
  mockAuth.mockReset();
});

describe("personal ownership: GET /api/workouts/[sessionId]", () => {
  it("owner can read their own session; a different logged-in user gets 404, not the data", async () => {
    const { GET } = await import("@/app/api/workouts/[sessionId]/route");
    const owner = await createTestUser();
    const other = await createTestUser();
    cleanupUsers.push(owner.id, other.id);
    const session = await createWorkoutSession(owner.id, new Date());

    mockAuth.mockResolvedValue(sessionFor(owner.id));
    const ownRes = await GET(new Request("http://test/api/workouts/x"), { params: Promise.resolve({ sessionId: session.id }) });
    expect(ownRes.status).toBe(200);

    mockAuth.mockResolvedValue(sessionFor(other.id));
    const otherRes = await GET(new Request("http://test/api/workouts/x"), { params: Promise.resolve({ sessionId: session.id }) });
    expect(otherRes.status).toBe(404);
  });
});

describe("group membership: GET /api/groups/[groupId]/posts", () => {
  it("a member can list posts; a non-member gets 403", async () => {
    const { GET } = await import("@/app/api/groups/[groupId]/posts/route");
    const owner = await createTestUser();
    const outsider = await createTestUser();
    cleanupUsers.push(owner.id, outsider.id);
    const group = await createTestGroup(owner.id);
    cleanupGroups.push(group.id);

    mockAuth.mockResolvedValue(sessionFor(owner.id));
    const memberRes = await GET(new Request("http://test/x"), { params: Promise.resolve({ groupId: group.id }) });
    expect(memberRes.status).toBe(200);

    mockAuth.mockResolvedValue(sessionFor(outsider.id));
    const outsiderRes = await GET(new Request("http://test/x"), { params: Promise.resolve({ groupId: group.id }) });
    expect(outsiderRes.status).toBe(403);
  });
});

describe("group LEADER role: POST /api/groups/[groupId]/goals", () => {
  it("the LEADER can create a goal; a plain MEMBER gets 403", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/goals/route");
    const leader = await createTestUser();
    const member = await createTestUser();
    cleanupUsers.push(leader.id, member.id);
    const group = await createTestGroup(leader.id);
    cleanupGroups.push(group.id);
    await addGroupMember(group.id, member.id);

    const body = JSON.stringify({ title: "Test Goal", unit: "REPS", targetValue: 100 });

    mockAuth.mockResolvedValue(sessionFor(member.id));
    const memberRes = await POST(new Request("http://test/x", { method: "POST", body }), {
      params: Promise.resolve({ groupId: group.id }),
    });
    expect(memberRes.status).toBe(403);

    mockAuth.mockResolvedValue(sessionFor(leader.id));
    const leaderRes = await POST(new Request("http://test/x", { method: "POST", body }), {
      params: Promise.resolve({ groupId: group.id }),
    });
    expect(leaderRes.status).toBe(201);

    await prisma.groupGoal.deleteMany({ where: { groupId: group.id } });
  });
});

describe("API-key auth + ownership: GET /api/v1/workouts/[sessionId]", () => {
  it("the key owner's workout is returned; the same key can't read another user's session id", async () => {
    const { GET } = await import("@/app/api/v1/workouts/[sessionId]/route");
    const keyOwner = await createTestUser();
    const other = await createTestUser();
    cleanupUsers.push(keyOwner.id, other.id);

    const { raw, hash, prefix } = generateApiKey();
    await prisma.apiKey.create({ data: { userId: keyOwner.id, name: "test", keyHash: hash, keyPrefix: prefix } });

    const ownSession = await createWorkoutSession(keyOwner.id, new Date());
    const otherSession = await createWorkoutSession(other.id, new Date());

    const req = (sessionId: string) =>
      GET(new Request("http://test/x", { headers: { Authorization: `Bearer ${raw}` } }), {
        params: Promise.resolve({ sessionId }),
      });

    expect((await req(ownSession.id)).status).toBe(200);
    expect((await req(otherSession.id)).status).toBe(404);

    // No key at all -> 401, not a silent pass-through.
    const noAuthRes = await GET(new Request("http://test/x"), { params: Promise.resolve({ sessionId: ownSession.id }) });
    expect(noAuthRes.status).toBe(401);
  });
});

describe("challenge-attempt ownership: POST /api/challenge-attempts/[attemptId]/increment", () => {
  it("the attempt's owner can increment it; a different user gets 403", async () => {
    const { POST } = await import("@/app/api/challenge-attempts/[attemptId]/increment/route");
    const owner = await createTestUser();
    const other = await createTestUser();
    const exercise = await createTestExercise();
    cleanupUsers.push(owner.id, other.id);
    cleanupExercises.push(exercise.id);
    const group = await createTestGroup(owner.id);
    cleanupGroups.push(group.id);

    const template = await prisma.challengeTemplate.create({
      data: { name: `Test Template ${exercise.id}`, exerciseId: exercise.id, isDefault: false },
    });
    cleanupTemplates.push(template.id);
    const dailyChallenge = await prisma.groupDailyChallenge.create({
      data: { groupId: group.id, challengeTemplateId: template.id, activatedById: owner.id },
    });
    const goal = await prisma.userChallengeGoal.create({
      data: { groupDailyChallengeId: dailyChallenge.id, userId: owner.id, targetReps: 1000 },
    });
    const attempt = await prisma.dailyChallengeAttempt.create({
      data: { userChallengeGoalId: goal.id, dateKey: "2099-01-01", targetRepsSnapshot: 1000 },
    });

    mockAuth.mockResolvedValue(sessionFor(other.id));
    const otherRes = await POST(new Request("http://test/x", { method: "POST", body: JSON.stringify({ amount: 1 }) }), {
      params: Promise.resolve({ attemptId: attempt.id }),
    });
    expect(otherRes.status).toBe(403);

    mockAuth.mockResolvedValue(sessionFor(owner.id));
    const ownerRes = await POST(new Request("http://test/x", { method: "POST", body: JSON.stringify({ amount: 1 }) }), {
      params: Promise.resolve({ attemptId: attempt.id }),
    });
    expect(ownerRes.status).toBe(200);
  });
});

describe("admin-only: GET /api/admin/users", () => {
  it("an admin gets the user list; a non-admin gets 403", async () => {
    const { GET } = await import("@/app/api/admin/users/route");
    const admin = await createTestUser({ isAdmin: true });
    const regular = await createTestUser();
    cleanupUsers.push(admin.id, regular.id);

    mockAuth.mockResolvedValue(sessionFor(regular.id));
    expect((await GET()).status).toBe(403);

    mockAuth.mockResolvedValue(sessionFor(admin.id));
    expect((await GET()).status).toBe(200);
  });
});
