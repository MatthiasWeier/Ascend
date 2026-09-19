import Link from "next/link";
import { PlusCircle, Flame } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBrainSuggestion } from "@/lib/workout-brain";
import { computePrSetIds } from "@/lib/personal-records";
import { getPendingDailyChallenges } from "@/lib/pending-challenges";
import { getRecentGroupActivity } from "@/lib/group-activity";
import { computeCurrentStreak } from "@/lib/streak";
import { Button } from "@/components/ui/button";
import { BrainCard } from "@/components/brain-card";
import { DailyChallengeReminder } from "@/components/daily-challenge-reminder";
import { HomeFeed } from "@/components/home-feed";
import { MiniActivity } from "@/components/mini-activity";
import { SideGoals } from "@/components/side-goals";
import { DashboardRefresh } from "@/components/dashboard-refresh";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { getT } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const { t } = await getT();
  const session = await auth();
  const userId = session!.user.id;

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);

  const [suggestion, sessions, prSetIds, pendingChallenges, groupActivity, streak, user, memberships, recentDays] =
    await Promise.all([
      getBrainSuggestion(userId, t),
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 40,
        include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
      }),
      computePrSetIds(userId),
      getPendingDailyChallenges(userId),
      getRecentGroupActivity(userId, 60),
      computeCurrentStreak(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { bodyWeightKg: true } }),
      prisma.groupMember.findMany({
        where: { userId },
        select: { group: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      }),
      prisma.workoutSession.findMany({
        where: { userId, date: { gte: twelveWeeksAgo } },
        select: { date: true, _count: { select: { sets: true } } },
      }),
    ]);

  const groups = memberships.map((m) => m.group);

  // Which groups each own workout was shared into - lets the group filter
  // chips also match your own workouts that you posted there.
  const shares = await prisma.groupPost.findMany({
    where: { userId, type: "WORKOUT_SHARE", workoutSessionId: { in: sessions.map((s) => s.id) } },
    select: { workoutSessionId: true, groupId: true },
  });
  const sharedGroupsBySession = new Map<string, string[]>();
  for (const s of shares) {
    if (!s.workoutSessionId) continue;
    sharedGroupsBySession.set(s.workoutSessionId, [...(sharedGroupsBySession.get(s.workoutSessionId) ?? []), s.groupId]);
  }

  const ownWorkouts = sessions.map((s) => ({
    id: s.id,
    date: s.date,
    notes: s.notes,
    perceivedExertion: s.perceivedExertion,
    skinCondition: s.skinCondition,
    sets: s.sets,
    sharedGroupIds: sharedGroupsBySession.get(s.id) ?? [],
  }));

  return (
    <DashboardRefresh>
      <div className="mx-auto max-w-2xl px-4 py-6 xl:max-w-6xl">
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="xl:hidden">
              <DailyChallengeReminder pending={pendingChallenges} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("Hey, {name}", { name: session!.user.name ?? "" })}</h1>
                {streak > 0 ? (
                  <p className="flex items-center gap-1 text-sm font-medium text-amber-500">
                    <Flame className="size-4" />
                    {streak === 1 ? t("1 Tag Streak") : t("{n} Tage Streak", { n: streak })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("Schön, dass du da bist.")}</p>
                )}
              </div>
              <Button render={<Link href="/dashboard/workouts/new" />} className="hidden sm:inline-flex">
                <PlusCircle className="size-4" />
                {t("Workout")}
              </Button>
            </div>

            <div className="xl:hidden">
              <BrainCard suggestion={suggestion} />
            </div>

            <Button render={<Link href="/dashboard/workouts/new" />} size="lg" className="w-full sm:hidden">
              <PlusCircle className="size-4" />
              {t("Workout eintragen")}
            </Button>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">{t("Feed")}</h2>
              {sessions.length === 0 && groupActivity.length === 0 ? (
                <OnboardingChecklist hasBodyWeight={user?.bodyWeightKg != null} hasGroup={groups.length > 0} />
              ) : (
                <HomeFeed
                  me={userId}
                  ownWorkouts={ownWorkouts}
                  activity={groupActivity}
                  groups={groups}
                  prSetIds={prSetIds}
                />
              )}
            </div>
          </div>

          {/* Desktop side column: what used to sit above the feed, kept in view */}
          <aside className="hidden xl:sticky xl:top-20 xl:flex xl:flex-col xl:gap-4">
            <BrainCard suggestion={suggestion} />
            <DailyChallengeReminder pending={pendingChallenges} />
            <MiniActivity sessions={recentDays.map((d) => ({ date: d.date, sets: d._count.sets }))} />
            <SideGoals userId={userId} groups={groups} />
          </aside>
        </div>
      </div>
    </DashboardRefresh>
  );
}
