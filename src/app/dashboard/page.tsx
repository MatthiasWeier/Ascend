import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 10,
    include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hey, {session!.user.name}</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-sm text-gray-500 underline">Abmelden</button>
        </form>
      </div>

      <Link
        href="/dashboard/workouts/new"
        className="mb-8 block w-full rounded bg-black px-4 py-3 text-center font-medium text-white dark:bg-white dark:text-black"
      >
        + Workout eintragen
      </Link>

      <h2 className="mb-4 text-lg font-semibold">Letzte Workouts</h2>
      {sessions.length === 0 && (
        <p className="text-gray-500">Noch keine Workouts eingetragen.</p>
      )}
      <ul className="flex flex-col gap-4">
        {sessions.map((s) => (
          <li key={s.id} className="rounded border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
              <span>{new Date(s.date).toLocaleDateString("de-DE")}</span>
              <span className="flex gap-3">
                {s.perceivedExertion != null && <span>Anstrengung: {s.perceivedExertion}/10</span>}
                {s.skinCondition != null && <span>Haut: {s.skinCondition}/10</span>}
              </span>
            </div>
            <ul className="flex flex-col gap-1">
              {s.sets.map((set) => (
                <li key={set.id} className="text-sm">
                  {set.exercise.name}:{" "}
                  {set.durationSec != null
                    ? `${set.durationSec}s`
                    : `${set.reps ?? "-"} Wdh × ${set.weightKg ?? 0}kg`}
                </li>
              ))}
            </ul>
            {s.notes && <p className="mt-2 text-sm italic text-gray-500">{s.notes}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
