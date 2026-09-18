import Link from "next/link";
import { Check, Dumbbell, Image as ImageIcon, MessageSquare, XCircle } from "lucide-react";
import type { ActivityItem } from "@/lib/group-activity";
import { formatTimeAgo } from "@/lib/time-ago";

function describeItem(item: ActivityItem): { icon: typeof Dumbbell; text: string } {
  switch (item.kind) {
    case "WORKOUT_SHARE":
      return { icon: Dumbbell, text: "hat ein Workout gepostet" };
    case "CHAT_PHOTO":
      return { icon: ImageIcon, text: "hat ein Foto gepostet" };
    case "CHAT_TEXT":
      return { icon: MessageSquare, text: `hat geschrieben: "${item.content}"` };
    case "CHALLENGE_COMPLETED":
      return {
        icon: Check,
        text: `hat "${item.templateName}" geschafft (${item.currentReps}/${item.targetRepsSnapshot})`,
      };
    case "CHALLENGE_ENDED_EARLY":
      return {
        icon: XCircle,
        text: `hat "${item.templateName}" abgebrochen (${item.currentReps}/${item.targetRepsSnapshot})`,
      };
  }
}

export function GroupActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">Gruppen-Aktivität</h2>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => {
          const { icon: Icon, text } = describeItem(item);
          const iconColor =
            item.kind === "CHALLENGE_COMPLETED"
              ? "text-success"
              : item.kind === "CHALLENGE_ENDED_EARLY"
                ? "text-destructive"
                : "text-primary";
          return (
            <Link
              key={i}
              href={`/dashboard/groups/${item.groupId}`}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="font-medium">{item.userName}</span> {text}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.groupName} · {formatTimeAgo(item.timestamp)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
