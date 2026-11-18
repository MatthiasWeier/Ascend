import { NextResponse } from "next/server";
import { z } from "zod";
import type { MuscleFocus } from "@prisma/client";
import { authenticateApiKey, requireWriteAccess } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { computeLoadPercents, ALL_FOCUSES } from "@/lib/muscle-focus";
import { makeBodyWeightResolver } from "@/lib/bodyweight";

// Balance-Ziele (target training split) vs. actual, all-time - the same
// numbers the dashboard radar chart shows, as plain JSON.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sets, goals, resolveBodyWeight] = await Promise.all([
    prisma.workoutSet.findMany({
      where: { session: { userId: auth.userId } },
      select: {
        reps: true,
        weightKg: true,
        durationSec: true,
        setType: true,
        session: { select: { date: true } },
        exercise: { select: { focus: true, isBodyweight: true } },
      },
    }),
    prisma.balanceGoal.findMany({ where: { userId: auth.userId } }),
    makeBodyWeightResolver(auth.userId),
  ]);

  const actual = computeLoadPercents(
    sets.map((s) => ({
      ...s,
      focus: s.exercise.focus,
      isBodyweight: s.exercise.isBodyweight,
      bodyWeightKg: s.exercise.isBodyweight ? resolveBodyWeight(s.session.date) : null,
    }))
  );
  const targetByFocus = new Map(goals.map((g) => [g.focus, g.targetPercent]));

  return NextResponse.json({
    focuses: ALL_FOCUSES.map((focus) => ({
      focus,
      actualPercent: actual[focus],
      targetPercent: targetByFocus.get(focus) ?? null,
    })),
  });
}

const patchSchema = z.object({
  goals: z
    .array(
      z.object({
        focus: z.enum(ALL_FOCUSES as [string, ...string[]]),
        targetPercent: z.number().min(0).max(100),
      })
    )
    .min(1)
    .max(ALL_FOCUSES.length),
});

// Set Balance-Ziele targets - upsert per focus, same semantics as the
// settings page's own PATCH.
export async function PATCH(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forbidden = requireWriteAccess(auth);
  if (forbidden) return forbidden;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.goals.map((g) =>
      prisma.balanceGoal.upsert({
        where: { userId_focus: { userId: auth.userId, focus: g.focus as MuscleFocus } },
        create: { userId: auth.userId, focus: g.focus as MuscleFocus, targetPercent: g.targetPercent },
        update: { targetPercent: g.targetPercent },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
