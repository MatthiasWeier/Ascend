import { prisma } from "@/lib/prisma";
import type { MuscleFocus } from "@prisma/client";
import { FOCUS_LABEL, ALL_FOCUSES } from "@/lib/muscle-focus";

export { FOCUS_LABEL };

// Grip-heavy focuses that skin recovery should gate.
const GRIP_DEPENDENT_FOCUSES: MuscleFocus[] = ["PULL", "GRIP"];

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export type BrainSuggestion = {
  suggestedFocus: MuscleFocus;
  focusDaysSince: number | null;
  isOverloaded: boolean;
  recentAvgExertion: number | null;
  skinRecoveryDaysNeeded: number;
  skinDaysSince: number | null;
  skinRecovered: boolean;
  headline: string;
  detail: string;
};

export async function getBrainSuggestion(userId: string): Promise<BrainSuggestion> {
  const now = new Date();

  const sets = await prisma.workoutSet.findMany({
    where: { session: { userId } },
    select: { session: { select: { date: true } }, exercise: { select: { focus: true } } },
    orderBy: { session: { date: "desc" } },
  });

  const lastTrainedByFocus = new Map<MuscleFocus, Date>();
  for (const set of sets) {
    const focus = set.exercise.focus;
    if (!lastTrainedByFocus.has(focus)) {
      lastTrainedByFocus.set(focus, set.session.date);
    }
  }

  let suggestedFocus: MuscleFocus = ALL_FOCUSES[0];
  let focusDaysSince: number | null = null;
  let maxGap = -1;
  for (const focus of ALL_FOCUSES) {
    const lastDate = lastTrainedByFocus.get(focus);
    const gap = lastDate ? daysBetween(lastDate, now) : Number.MAX_SAFE_INTEGER;
    if (gap > maxGap) {
      maxGap = gap;
      suggestedFocus = focus;
      focusDaysSince = lastDate ? gap : null;
    }
  }

  // Overload protection: 2+ sessions in the last 3 days with high average
  // perceived exertion suggests the nervous system needs a rest day.
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: threeDaysAgo } },
    select: { perceivedExertion: true },
  });
  const exertionValues = recentSessions
    .map((s) => s.perceivedExertion)
    .filter((v): v is number => v != null);
  const recentAvgExertion =
    exertionValues.length > 0
      ? exertionValues.reduce((a, b) => a + b, 0) / exertionValues.length
      : null;
  const isOverloaded = recentSessions.length >= 2 && (recentAvgExertion ?? 0) >= 8;

  // Skin recovery: worse self-reported skin condition needs more days off
  // grip-heavy work before it's recommended again.
  const lastSkinSession = await prisma.workoutSession.findFirst({
    where: { userId, skinCondition: { not: null } },
    orderBy: { date: "desc" },
    select: { date: true, skinCondition: true },
  });
  let skinRecoveryDaysNeeded = 0;
  let skinDaysSince: number | null = null;
  if (lastSkinSession?.skinCondition != null) {
    const c = lastSkinSession.skinCondition;
    skinRecoveryDaysNeeded = c >= 9 ? 5 : c >= 7 ? 3 : c >= 4 ? 1 : 0;
    skinDaysSince = daysBetween(lastSkinSession.date, now);
  }
  const skinRecovered = skinDaysSince == null || skinDaysSince >= skinRecoveryDaysNeeded;

  let effectiveFocus = suggestedFocus;
  let headline: string;
  let detail: string;

  if (isOverloaded) {
    headline = "Ruhetag empfohlen";
    detail = `Deine letzten Workouts waren mit Ø ${recentAvgExertion?.toFixed(
      1
    )}/10 sehr intensiv. Gib deinem Nervensystem heute eine Pause.`;
  } else if (!skinRecovered && GRIP_DEPENDENT_FOCUSES.includes(suggestedFocus)) {
    effectiveFocus = "LEGS";
    const remaining = skinRecoveryDaysNeeded - (skinDaysSince ?? 0);
    headline = `${FOCUS_LABEL.LEGS} statt ${FOCUS_LABEL[suggestedFocus]}`;
    detail = `Deine Haut braucht noch ${remaining} Tag${
      remaining === 1 ? "" : "e"
    } zur Regeneration. Heute lieber Beine trainieren.`;
  } else {
    headline = FOCUS_LABEL[suggestedFocus];
    detail =
      focusDaysSince == null
        ? "Du hast diesen Fokus noch nie trainiert. Perfekter Einstieg."
        : `Zuletzt vor ${focusDaysSince} Tag${focusDaysSince === 1 ? "" : "en"} trainiert — am längsten her von allen Bereichen.`;
  }

  return {
    suggestedFocus: effectiveFocus,
    focusDaysSince,
    isOverloaded,
    recentAvgExertion,
    skinRecoveryDaysNeeded,
    skinDaysSince,
    skinRecovered,
    headline,
    detail,
  };
}
