import Link from "next/link";
import { Target } from "lucide-react";
import { buildGroupGoalsView } from "@/lib/group-goals";
import { getT } from "@/lib/i18n/server";

// Desktop side column: open group goals across all of the viewer's groups,
// closest-to-done first.
export async function SideGoals({ userId, groups }: { userId: string; groups: { id: string; name: string }[] }) {
  if (groups.length === 0) return null;
  const { t, locale } = await getT();
  const numberLocale = locale === "en" ? "en-GB" : "de-DE";

  const perGroup = await Promise.all(
    groups.map(async (group) => ({ group, goals: await buildGroupGoalsView(group.id, userId) }))
  );
  const goals = perGroup
    .flatMap(({ group, goals }) =>
      goals.filter((g) => !g.isComplete).map((g) => ({ ...g, groupId: group.id, groupName: group.name }))
    )
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);
  if (goals.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString(numberLocale, { maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Target className="size-4 text-primary" />
        {t("Gruppenziele")}
      </span>
      <div className="flex flex-col gap-3">
        {goals.map((g) => (
          <Link
            key={g.id}
            href={`/dashboard/groups/${g.groupId}?tab=goals`}
            className="flex flex-col gap-1.5 rounded-lg transition-colors hover:bg-accent/40"
          >
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium">{g.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmt(g.total)} / {fmt(g.targetValue)} {t(g.unitLabel)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(g.progress * 100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{g.groupName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
