"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "@/components/feed-list";
import { QuestCard } from "@/components/quests/quest-card";
import { useLocale } from "@/components/locale-provider";
import type { QuestDTO } from "@/lib/quests";

type GroupQuest = QuestDTO & { user: { id: string; name: string; avatarUrl: string | null } };

// Read-only: what the members chose to share. Everyone edits their own
// quests on /dashboard/quests.
export function GroupQuests({ groupId }: { groupId: string }) {
  const { t } = useLocale();
  const [quests, setQuests] = useState<GroupQuest[] | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/quests`)
      .then((r) => r.json())
      .then((data: { quests: GroupQuest[] }) => setQuests(data.quests))
      .catch(() => setQuests([]));
  }, [groupId]);

  if (quests == null) return <Skeleton className="h-32 w-full" />;
  if (quests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t("Nobody is sharing a sidequest yet. Create your own under \"Quests\" in the navigation.")}
      </p>
    );
  }

  return (
    <FeedList>
      {quests.map((q) => (
        <QuestCard key={q.id} quest={q} owner={q.user} />
      ))}
    </FeedList>
  );
}
