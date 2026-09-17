import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { PendingChallenge } from "@/lib/pending-challenges";

export function DailyChallengeReminder({ pending }: { pending: PendingChallenge[] }) {
  if (pending.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <AlertCircle className="size-4 shrink-0 text-primary" />
      <span className="font-medium">
        {pending.length === 1
          ? "Noch offen heute:"
          : `Noch ${pending.length} offene Challenges heute:`}
      </span>
      {pending.map((p, i) => (
        <Link
          key={`${p.groupId}-${p.templateName}-${i}`}
          href={`/dashboard/groups/${p.groupId}?tab=challenges`}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          {p.templateName} ({p.groupName})
        </Link>
      ))}
    </div>
  );
}
