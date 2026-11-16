import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

// Read-only - to actually log a workout from a template's exercises, POST
// to /api/v1/workouts with those exerciseIds (a template stores no
// reps/weight to replay, same as the in-app "start from template" flow).
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.workoutTemplate.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    include: { entries: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ templates });
}
