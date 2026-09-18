import { prisma } from "@/lib/prisma";
import type { MuscleFocus } from "@prisma/client";
import { FOCUS_LABEL, ALL_FOCUSES, computeLoadPercents } from "@/lib/muscle-focus";

export { FOCUS_LABEL };

// Grip-heavy focuses that skin recovery should gate.
const GRIP_DEPENDENT_FOCUSES: MuscleFocus[] = ["PULL", "GRIP"];

// A focus counts as "meaningfully behind" its Balance-Ziel once its actual
// share of training load trails the target by more than this many
// percentage points - small gaps are noise, this is a deliberate signal
// that the user set a goal and isn't hitting it.
const BALANCE_DEFICIT_THRESHOLD = 5;

// How many days a focus needs before it's "ready" again, based on how
// wrecked the last session that trained it was rated (1-10). A focus
// trained lightly recovers immediately; one trained near-max effort needs
// real time off even if the calendar alone would call it "overdue".
function fatigueRecoveryDays(rating: number): number {
  if (rating >= 9) return 3;
  if (rating >= 7) return 2;
  if (rating >= 5) return 1;
  return 0;
}

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

  const [sets, balanceGoals] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId } },
      select: {
        reps: true,
        weightKg: true,
        durationSec: true,
        setType: true,
        session: {
          select: { date: true, focusFatigue: { select: { focus: true, rating: true } } },
        },
        exercise: { select: { focus: true } },
      },
      orderBy: { session: { date: "desc" } },
    }),
    prisma.balanceGoal.findMany({ where: { userId } }),
  ]);

  // Sets arrive newest-session-first, so the first time a focus is seen
  // here is also the most recent session that trained it - same walk
  // captures both "when" and "how fatigued that session left it".
  const lastTrainedByFocus = new Map<MuscleFocus, Date>();
  const lastFatigueByFocus = new Map<MuscleFocus, number>();
  for (const set of sets) {
    const focus = set.exercise.focus;
    if (!lastTrainedByFocus.has(focus)) {
      lastTrainedByFocus.set(focus, set.session.date);
      const fatigueRow = set.session.focusFatigue.find((f) => f.focus === focus);
      if (fatigueRow) lastFatigueByFocus.set(focus, fatigueRow.rating);
    }
  }

  const targetByFocus = new Map(balanceGoals.map((g) => [g.focus, g.targetPercent]));
  const actualByFocus = computeLoadPercents(sets.map((s) => ({ ...s, focus: s.exercise.focus })));

  // Balance-Ziele are a hard constraint, not just a preference: a focus the
  // user explicitly set to 0% (injury, "no legs ever", whatever) must never
  // be suggested, no matter how overdue it looks by recency alone.
  const excludedFocuses = new Set(ALL_FOCUSES.filter((f) => targetByFocus.get(f) === 0));
  let eligibleFocuses = ALL_FOCUSES.filter((f) => !excludedFocuses.has(f));
  if (eligibleFocuses.length === 0) eligibleFocuses = ALL_FOCUSES; // every focus zeroed out - nonsensical, ignore rather than suggest nothing

  function gapDays(focus: MuscleFocus): number {
    const lastDate = lastTrainedByFocus.get(focus);
    return lastDate ? daysBetween(lastDate, now) : Number.MAX_SAFE_INTEGER;
  }

  function deficit(focus: MuscleFocus): number | null {
    const target = targetByFocus.get(focus);
    return target == null ? null : target - actualByFocus[focus];
  }

  function isFatigueRecovering(focus: MuscleFocus): boolean {
    const rating = lastFatigueByFocus.get(focus);
    if (rating == null) return false;
    return gapDays(focus) < fatigueRecoveryDays(rating);
  }

  // A focus meaningfully behind its own Balance-Ziel wins outright - that's
  // the whole point of setting one. Among focuses without that signal (or
  // when none qualify), the longest-overdue one wins, same as before
  // Balance-Ziele existed. Either way, a focus still recovering from a
  // hard session is skipped first - training it again isn't smart just
  // because it's "overdue" or behind a goal, unless skipping it would
  // leave nothing to suggest at all.
  function pickBestFocus(candidates: MuscleFocus[]): MuscleFocus {
    const recovered = candidates.filter((f) => !isFatigueRecovering(f));
    const pool = recovered.length > 0 ? recovered : candidates;

    let bestDeficitFocus: MuscleFocus | null = null;
    let bestDeficit = BALANCE_DEFICIT_THRESHOLD;
    for (const focus of pool) {
      const d = deficit(focus);
      if (d != null && d > bestDeficit) {
        bestDeficit = d;
        bestDeficitFocus = focus;
      }
    }
    if (bestDeficitFocus) return bestDeficitFocus;

    let best = pool[0];
    let bestGap = -1;
    for (const focus of pool) {
      const gap = gapDays(focus);
      if (gap > bestGap) {
        bestGap = gap;
        best = focus;
      }
    }
    return best;
  }

  const suggestedFocus = pickBestFocus(eligibleFocuses);
  const rawGap = gapDays(suggestedFocus);
  const focusDaysSince = rawGap === Number.MAX_SAFE_INTEGER ? null : rawGap;
  const suggestedDeficit = deficit(suggestedFocus);
  const isBalanceDriven = suggestedDeficit != null && suggestedDeficit > BALANCE_DEFICIT_THRESHOLD;

  function describeSuggested() {
    if (isBalanceDriven) {
      return {
        headline: FOCUS_LABEL[suggestedFocus],
        detail: `Bei ${FOCUS_LABEL[suggestedFocus]} liegst du bei ${actualByFocus[suggestedFocus]}% deines Trainingsvolumens - Ziel sind ${targetByFocus.get(
          suggestedFocus
        )}%. Zeit, das auszugleichen.`,
      };
    }
    return {
      headline: FOCUS_LABEL[suggestedFocus],
      detail:
        focusDaysSince == null
          ? "Du hast diesen Fokus noch nie trainiert. Perfekter Einstieg."
          : `Zuletzt vor ${focusDaysSince} Tag${focusDaysSince === 1 ? "" : "en"} trainiert — am längsten her von allen Bereichen.`,
    };
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
    const safeCandidates = eligibleFocuses.filter((f) => !GRIP_DEPENDENT_FOCUSES.includes(f));
    if (safeCandidates.length > 0) {
      effectiveFocus = pickBestFocus(safeCandidates);
      const remaining = skinRecoveryDaysNeeded - (skinDaysSince ?? 0);
      headline = `${FOCUS_LABEL[effectiveFocus]} statt ${FOCUS_LABEL[suggestedFocus]}`;
      detail = `Deine Haut braucht noch ${remaining} Tag${
        remaining === 1 ? "" : "e"
      } zur Regeneration. Heute lieber ${FOCUS_LABEL[effectiveFocus]} trainieren.`;
    } else {
      // No safe non-grip focus left to swap in (e.g. everything else is
      // excluded via Balance-Ziele) - fall back to the normal suggestion.
      ({ headline, detail } = describeSuggested());
    }
  } else {
    ({ headline, detail } = describeSuggested());
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
