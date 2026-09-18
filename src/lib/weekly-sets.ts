import { prisma } from "@/lib/prisma";
import { ALL_FOCUSES, FOCUS_LABEL } from "@/lib/muscle-focus";
import { mondayOfGermanWeek } from "@/lib/german-time";
import type { MuscleFocus } from "@prisma/client";

// Working sets (warm-ups excluded) per muscle focus so far this calendar
// week - one of the most-used volume-management metrics in hypertrophy
// training, separate from the load-weighted Balance breakdown.
export async function getWeeklySetCounts(
  userId: string
): Promise<{ focus: MuscleFocus; label: string; count: number }[]> {
  const monday = mondayOfGermanWeek();

  const sets = await prisma.workoutSet.findMany({
    where: {
      session: { userId, date: { gte: monday } },
      setType: { not: "WARMUP" },
    },
    select: { exercise: { select: { focus: true } } },
  });

  const counts = new Map<MuscleFocus, number>();
  for (const s of sets) {
    counts.set(s.exercise.focus, (counts.get(s.exercise.focus) ?? 0) + 1);
  }

  return ALL_FOCUSES.map((focus) => ({ focus, label: FOCUS_LABEL[focus], count: counts.get(focus) ?? 0 }));
}
