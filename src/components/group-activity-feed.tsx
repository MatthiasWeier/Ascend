import Link from "next/link";
import { Check, Dumbbell, XCircle } from "lucide-react";
import type { ActivityItem } from "@/lib/group-activity";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "gerade eben";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} Tag${days === 1 ? "" : "en"}`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

export function GroupActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Gruppen-Aktivität</h2>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/dashboard/groups/${item.groupId}`}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            {item.kind === "WORKOUT_SHARE" ? (
              <Dumbbell className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : item.kind === "CHALLENGE_COMPLETED" ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="font-medium">{item.userName}</span>{" "}
                {item.kind === "WORKOUT_SHARE"
                  ? "hat ein Workout gepostet"
                  : item.kind === "CHALLENGE_COMPLETED"
                    ? `hat "${item.templateName}" geschafft (${item.currentReps}/${item.targetRepsSnapshot})`
                    : `hat "${item.templateName}" abgebrochen (${item.currentReps}/${item.targetRepsSnapshot})`}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.groupName} · {timeAgo(item.timestamp)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
