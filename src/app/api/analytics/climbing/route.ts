import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeRank } from "@/lib/climbing-grades";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const style = (searchParams.get("style") ?? "BOULDER") as "BOULDER" | "ROUTE";

  const sends = await prisma.climbingSend.findMany({
    where: { userId: session.user.id, style },
    select: { grade: true, count: true },
  });

  const counts = new Map<string, number>();
  for (const send of sends) {
    const key = send.grade.trim();
    counts.set(key, (counts.get(key) ?? 0) + send.count);
  }

  const grades = Array.from(counts.entries())
    .map(([grade, count]) => ({ grade, count, rank: gradeRank(style, grade) }))
    .sort((a, b) => a.rank - b.rank);

  return NextResponse.json({ grades });
}
