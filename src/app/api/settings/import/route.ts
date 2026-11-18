import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWorkoutCsv, guessFocus } from "@/lib/csv-import";

const MAX_CSV_BYTES = 5 * 1024 * 1024;

// Best-effort import of a Strong or Hevy CSV export. Historical data only -
// deliberately skips goal auto-contribution and PR-toast bookkeeping,
// since "I just imported 400 old sets" isn't the same moment as "I just
// did a set", and re-running those for a bulk import would be both slow
// and produce a wall of misleading "new PR" / goal-progress noise.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file submitted" }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "File too large (max. 5 MB)" }, { status: 400 });
  }

  const text = await file.text();
  let sessions;
  try {
    sessions = parseWorkoutCsv(text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Konnte CSV nicht lesen" },
      { status: 400 }
    );
  }
  if (sessions.length === 0) {
    return NextResponse.json({ error: "No sets found in the file" }, { status: 400 });
  }

  const myGroupIds = (
    await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })
  ).map((m) => m.groupId);
  const visibleExercises = await prisma.exercise.findMany({
    where: {
      OR: [{ isDefault: true }, { createdById: userId }, { groupId: { in: myGroupIds } }],
    },
    select: { id: true, name: true, type: true },
  });
  const exerciseByName = new Map(visibleExercises.map((e) => [e.name.toLowerCase(), e]));

  let sessionsImported = 0;
  let setsImported = 0;
  let newExercisesCreated = 0;

  for (const s of sessions) {
    const setsToCreate: {
      exerciseId: string;
      reps: number | null;
      weightKg: number | null;
      durationSec: number | null;
      notes: string | null;
      order: number;
    }[] = [];

    let order = 0;
    for (const ex of s.exercises) {
      let exercise = exerciseByName.get(ex.name.toLowerCase());
      if (!exercise) {
        const isHold = ex.sets.every((set) => set.durationSec != null && set.reps == null);
        const created = await prisma.exercise.create({
          data: {
            name: ex.name,
            type: isHold ? "HOLD" : "REPS",
            focus: guessFocus(ex.name),
            isBodyweight: false,
            isDefault: false,
            createdById: userId,
          },
          select: { id: true, name: true, type: true },
        });
        exerciseByName.set(ex.name.toLowerCase(), created);
        exercise = created;
        newExercisesCreated++;
      }

      for (const set of ex.sets) {
        setsToCreate.push({
          exerciseId: exercise.id,
          reps: exercise.type === "HOLD" ? null : set.reps,
          weightKg: set.weightKg,
          durationSec: exercise.type === "HOLD" ? (set.durationSec ?? set.reps) : null,
          notes: set.notes,
          order: order++,
        });
      }
    }

    if (setsToCreate.length === 0) continue;

    await prisma.workoutSession.create({
      data: {
        userId,
        date: s.date,
        notes: s.notes ? `Importiert: ${s.notes}` : "Importiert",
        sets: { create: setsToCreate },
      },
    });
    sessionsImported++;
    setsImported += setsToCreate.length;
  }

  return NextResponse.json({ sessionsImported, setsImported, newExercisesCreated });
}
