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
import { GroupActivityFeed } from "@/components/group-activity-feed";
import { WorkoutSessionCard } from "@/components/workout-session-card";
import { FeedList } from "@/components/feed-list";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [suggestion, sessions, prSetIds, pendingChallenges, groupActivity, streak] = await Promise.all([
    getBrainSuggestion(userId),
    prisma.workoutSession.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 15,
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    computePrSetIds(userId),
    getPendingDailyChallenges(userId),
    getRecentGroupActivity(userId),
    computeCurrentStreak(userId),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <DailyChallengeReminder pending={pendingChallenges} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hey, {session!.user.name}</h1>
          {streak > 0 ? (
            <p className="flex items-center gap-1 text-sm font-medium text-amber-500">
              <Flame className="size-4" />
              {streak} Tag{streak === 1 ? "" : "e"} Streak
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Schön, dass du da bist.</p>
          )}
        </div>
        <Button render={<Link href="/dashboard/workouts/new" />} className="hidden sm:inline-flex">
          <PlusCircle className="size-4" />
          Workout
        </Button>
      </div>

      <BrainCard suggestion={suggestion} />

      <GroupActivityFeed items={groupActivity} />

      <Button
        render={<Link href="/dashboard/workouts/new" />}
        size="lg"
        className="w-full sm:hidden"
      >
        <PlusCircle className="size-4" />
        Workout eintragen
      </Button>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Letzte Workouts</h2>
        {sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Noch keine Workouts eingetragen. Leg direkt los!
          </p>
        ) : (
          <FeedList>
            {sessions.map((s) => (
              <WorkoutSessionCard
                key={s.id}
                sessionId={s.id}
                date={s.date}
                notes={s.notes}
                perceivedExertion={s.perceivedExertion}
                skinCondition={s.skinCondition}
                sets={s.sets}
                prSetIds={prSetIds}
              />
            ))}
          </FeedList>
        )}
      </div>
    </div>
  );
}
