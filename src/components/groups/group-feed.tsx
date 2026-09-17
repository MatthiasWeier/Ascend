"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dumbbell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "@/components/feed-list";
import { PostComposer } from "@/components/groups/post-composer";
import { useSession } from "next-auth/react";

type Post = {
  id: string;
  type: "PHOTO" | "WORKOUT_SHARE" | "TEXT";
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  workoutSessionId: string | null;
  user: { id: string; name: string };
};

export function GroupFeed({
  groupId,
  initialAutoShare,
}: {
  groupId: string;
  initialAutoShare: boolean;
}) {
  const { data: authSession } = useSession();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [autoShare, setAutoShare] = useState(initialAutoShare);
  const [togglingAutoShare, setTogglingAutoShare] = useState(false);

  function refetch() {
    fetch(`/api/groups/${groupId}/posts`)
      .then((r) => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts));
  }

  useEffect(refetch, [groupId]);

  const myAlreadySharedIds = useMemo(() => {
    const myUserId = authSession?.user?.id;
    return new Set(
      (posts ?? [])
        .filter((p) => p.workoutSessionId != null && p.user.id === myUserId)
        .map((p) => p.workoutSessionId as string)
    );
  }, [posts, authSession]);

  async function handleToggleAutoShare(next: boolean) {
    setTogglingAutoShare(true);
    const res = await fetch(`/api/groups/${groupId}/auto-share`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setTogglingAutoShare(false);
    if (!res.ok) {
      toast.error("Konnte Einstellung nicht ändern.");
      return;
    }
    const data: { enabled: boolean; sharedCount: number } = await res.json();
    setAutoShare(data.enabled);
    if (!data.enabled) {
      toast("Automatisches Teilen aus.");
      return;
    }
    toast.success(
      data.sharedCount > 0
        ? `Automatisches Teilen an - ${data.sharedCount} Workout${data.sharedCount === 1 ? "" : "s"} nachgetragen.`
        : "Automatisches Teilen an."
    );
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <PostComposer groupId={groupId} alreadySharedIds={myAlreadySharedIds} onPosted={refetch} />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Workouts automatisch teilen</p>
          <p className="text-xs text-muted-foreground">
            Jedes neue Workout landet automatisch hier im Feed - inklusive aller bisherigen.
          </p>
        </div>
        <Switch checked={autoShare} onCheckedChange={handleToggleAutoShare} disabled={togglingAutoShare} />
      </div>

      {posts == null ? (
        <Skeleton className="h-32 w-full" />
      ) : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch nichts gepostet. Sei der Erste!
        </p>
      ) : (
        <FeedList>
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex flex-col gap-2 px-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{post.user.name}</span>
                  <span>
                    {new Date(post.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {post.type === "PHOTO" && post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.content ?? "Foto"}
                    className="max-h-96 w-full rounded-lg object-cover"
                  />
                )}

                {post.type === "WORKOUT_SHARE" && (
                  <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                    <Dumbbell className="mt-0.5 size-4 shrink-0 text-primary" />
                    <pre className="whitespace-pre-wrap font-sans text-sm">{post.content}</pre>
                  </div>
                )}

                {post.content && post.type !== "WORKOUT_SHARE" && (
                  <p className="text-sm">{post.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </FeedList>
      )}
    </div>
  );
}
