import { prisma } from "@/lib/prisma";
import type { Muscle, MuscleFocus } from "@prisma/client";
import { MUSCLE_FOCUS, MUSCLE_LABEL } from "@/lib/muscles";
import { getMuscleStats } from "@/lib/muscle-stats";
import { getActiveInjuries } from "@/lib/injuries-server";
import { BODY_PART_LABEL, blocksSuggestions, exerciseLoadedParts } from "@/lib/injuries";
import { resolveExerciseMuscles } from "@/lib/muscles";
import { FOCUS_LABEL, ALL_FOCUSES, computeLoadPercents } from "@/lib/muscle-focus";
import { makeBodyWeightResolver } from "@/lib/bodyweight";
import type { TFunction } from "@/lib/i18n";

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
  isSwap: boolean;
  // Set when a muscle the user wants to train more is what's suggested.
  suggestedMuscle: Muscle | null;
  exampleExercises: string[];
  // Set when exercises are held back because of an injury.
  injuryNote: string | null;
  headline: string;
  detail: string;
};

export async function getBrainSuggestion(userId: string, t: TFunction): Promise<BrainSuggestion> {
  const now = new Date();
  const focusName = (f: MuscleFocus) => t(FOCUS_LABEL[f]);

  const [sets, balanceGoals, resolveBodyWeight] = await Promise.all([
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
        exercise: { select: { focus: true, isBodyweight: true } },
      },
      orderBy: { session: { date: "desc" } },
    }),
    prisma.balanceGoal.findMany({ where: { userId } }),
    makeBodyWeightResolver(userId),
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
  const actualByFocus = computeLoadPercents(
    sets.map((s) => ({
      ...s,
      focus: s.exercise.focus,
      isBodyweight: s.exercise.isBodyweight,
      bodyWeightKg: s.exercise.isBodyweight ? resolveBodyWeight(s.session.date) : null,
    }))
  );

  // Muscle wishes ("Bizeps mehr"): a wished muscle is due again after 3 days
  // ("mehr") or 2 days ("viel mehr"); the most overdue one steers the focus.
  // Injuries: exercises loading an injured body part (moderate/severe) are
  // never suggested, and a focus with nothing left to do is skipped.
  const [injuries, catalogue] = await Promise.all([
    getActiveInjuries(userId),
    prisma.exercise.findMany({
      where: { OR: [{ isDefault: true }, { createdById: userId }] },
      select: { id: true, name: true, focus: true, muscles: { select: { muscle: true, role: true } } },
    }),
  ]);
  const blockedParts = new Set(injuries.filter((i) => blocksSuggestions(i.severity)).map((i) => i.bodyPart));
  const isBlocked = (e: (typeof catalogue)[number]) =>
    exerciseLoadedParts(e.name, e.focus, e.muscles).some((p) => blockedParts.has(p));
  const usableExercises = catalogue.filter((e) => !isBlocked(e));
  const primaryMusclesOf = (e: (typeof catalogue)[number]) =>
    resolveExerciseMuscles(e.focus, e.muscles).filter((r) => r.role === "PRIMARY").map((r) => r.muscle);

  const wishes = await prisma.musclePreference.findMany({ where: { userId } });
  const muscleStats = wishes.length > 0 ? await getMuscleStats(userId) : [];
  const dueWishes = wishes
    .map((w) => {
      const stat = muscleStats.find((s) => s.muscle === w.muscle);
      const interval = w.wish >= 2 ? 2 : 3;
      const daysSince = stat?.daysSince ?? null;
      return {
        muscle: w.muscle,
        focus: MUSCLE_FOCUS[w.muscle],
        daysSince,
        ratio: (daysSince ?? 30) / interval,
      };
    })
    .filter((w) => w.ratio >= 1)
    .filter((w) => blockedParts.size === 0 || usableExercises.some((e) => primaryMusclesOf(e).includes(w.muscle)))
    .sort((a, b) => b.ratio - a.ratio);

  // Balance-Ziele are a hard constraint, not just a preference: a focus the
  // user explicitly set to 0% (injury, "no legs ever", whatever) must never
  // be suggested, no matter how overdue it looks by recency alone.
  const excludedFocuses = new Set(ALL_FOCUSES.filter((f) => targetByFocus.get(f) === 0));
  let eligibleFocuses = ALL_FOCUSES.filter((f) => !excludedFocuses.has(f));
  if (eligibleFocuses.length === 0) eligibleFocuses = ALL_FOCUSES; // every focus zeroed out - nonsensical, ignore rather than suggest nothing
  if (blockedParts.size > 0) {
    const open = eligibleFocuses.filter((f) => usableExercises.some((e) => e.focus === f));
    if (open.length > 0) eligibleFocuses = open;
  }

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

    const wishFocus = dueWishes.find((w) => pool.includes(w.focus));
    if (wishFocus) return wishFocus.focus;

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
    const wish = dueWishes.find((w) => w.focus === suggestedFocus);
    if (wish) {
      return {
        headline: t(MUSCLE_LABEL[wish.muscle]),
        detail:
          wish.daysSince == null
            ? t("{muscle} is on your wish list - you have never trained it.", { muscle: t(MUSCLE_LABEL[wish.muscle]) })
            : t("{muscle} is on your wish list - last trained {n} days ago.", {
                muscle: t(MUSCLE_LABEL[wish.muscle]),
                n: wish.daysSince,
              }),
      };
    }
    if (isBalanceDriven) {
      return {
        headline: focusName(suggestedFocus),
        detail: t("For {focus} you're at {actual}% of your training volume - your target is {target}%. Time to balance that out.", {
          focus: focusName(suggestedFocus),
          actual: actualByFocus[suggestedFocus],
          target: targetByFocus.get(suggestedFocus) ?? 0,
        }),
      };
    }
    return {
      headline: focusName(suggestedFocus),
      detail:
        focusDaysSince == null
          ? t("You've never trained this focus. Perfect place to start.")
          : focusDaysSince === 1
            ? t("Last trained 1 day ago — the longest ago of all areas.")
            : t("Last trained {n} days ago — the longest ago of all areas.", { n: focusDaysSince }),
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
  let isSwap = false;
  let headline: string;
  let detail: string;

  if (isOverloaded) {
    headline = t("Rest day recommended");
    detail = t("Your last workouts were very intense at an average of {avg}/10. Give your nervous system a break today.", {
      avg: recentAvgExertion?.toFixed(1) ?? "",
    });
  } else if (!skinRecovered && GRIP_DEPENDENT_FOCUSES.includes(suggestedFocus)) {
    const safeCandidates = eligibleFocuses.filter((f) => !GRIP_DEPENDENT_FOCUSES.includes(f));
    if (safeCandidates.length > 0) {
      effectiveFocus = pickBestFocus(safeCandidates);
      isSwap = true;
      const remaining = skinRecoveryDaysNeeded - (skinDaysSince ?? 0);
      headline = t("{a} instead of {b}", { a: focusName(effectiveFocus), b: focusName(suggestedFocus) });
      detail =
        remaining === 1
          ? t("Your skin needs 1 more day to recover. Better train {focus} today.", { focus: focusName(effectiveFocus) })
          : t("Your skin needs {n} more days to recover. Better train {focus} today.", {
              n: remaining,
              focus: focusName(effectiveFocus),
            });
    } else {
      // No safe non-grip focus left to swap in (e.g. everything else is
      // excluded via Balance-Ziele) - fall back to the normal suggestion.
      ({ headline, detail } = describeSuggested());
    }
  } else {
    ({ headline, detail } = describeSuggested());
  }

  // Which wished muscle (if any) this suggestion serves, plus a few
  // exercises that train it - favouring ones the user already does.
  const wishMuscle = isOverloaded ? undefined : dueWishes.find((w) => w.focus === effectiveFocus)?.muscle;
  let exampleExercises: string[] = [];
  if (!isOverloaded) {
    const pool = usableExercises.filter((e) =>
      wishMuscle ? primaryMusclesOf(e).includes(wishMuscle) : e.focus === effectiveFocus
    );
    const usage = await prisma.workoutSet.groupBy({
      by: ["exerciseId"],
      where: { session: { userId } },
      _count: { _all: true },
    });
    const used = new Map(usage.map((u) => [u.exerciseId, u._count._all]));
    exampleExercises = pool
      .sort((x, y) => (used.get(y.id) ?? 0) - (used.get(x.id) ?? 0) || x.name.localeCompare(y.name))
      .slice(0, 3)
      .map((e) => e.name);
  }
  const injuryNote =
    blockedParts.size > 0
      ? t("Considering: {parts} - affected exercises are not suggested.", {
          parts: Array.from(blockedParts).map((p) => t(BODY_PART_LABEL[p])).join(", "),
        })
      : null;

  return {
    suggestedFocus: effectiveFocus,
    suggestedMuscle: wishMuscle ?? null,
    exampleExercises,
    injuryNote,
    focusDaysSince,
    isOverloaded,
    recentAvgExertion,
    skinRecoveryDaysNeeded,
    skinDaysSince,
    skinRecovered,
    isSwap,
    headline,
    detail,
  };
}
