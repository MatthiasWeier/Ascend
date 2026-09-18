import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prometheus text-exposition format. Disabled unless METRICS_TOKEN is set,
// so a fresh instance never leaks usage counts publicly by accident -
// self-hosters wire this into their own scrape config with
// `?token=...` or an `Authorization: Bearer ...` header.
export async function GET(request: Request) {
  const token = process.env.METRICS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Metrics not configured (set METRICS_TOKEN)" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? searchParams.get("token");
  if (provided !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, sessions, sets, groups] = await Promise.all([
    prisma.user.count(),
    prisma.workoutSession.count(),
    prisma.workoutSet.count(),
    prisma.group.count(),
  ]);

  const lines = [
    "# HELP ascend_users_total Registered users.",
    "# TYPE ascend_users_total gauge",
    `ascend_users_total ${users}`,
    "# HELP ascend_workout_sessions_total Logged workout sessions.",
    "# TYPE ascend_workout_sessions_total gauge",
    `ascend_workout_sessions_total ${sessions}`,
    "# HELP ascend_workout_sets_total Logged workout sets.",
    "# TYPE ascend_workout_sets_total gauge",
    `ascend_workout_sets_total ${sets}`,
    "# HELP ascend_groups_total Groups.",
    "# TYPE ascend_groups_total gauge",
    `ascend_groups_total ${groups}`,
    "# HELP ascend_process_uptime_seconds Node process uptime.",
    "# TYPE ascend_process_uptime_seconds counter",
    `ascend_process_uptime_seconds ${process.uptime()}`,
  ];

  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
