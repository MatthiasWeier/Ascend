"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function GroupFeed({ groupId }: { groupId: string }) {
  const { data: authSession } = useSession();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [sharingAll, setSharingAll] = useState(false);

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

  async function handleShareAll() {
    setSharingAll(true);
    const res = await fetch(`/api/groups/${groupId}/posts/share-all`, { method: "POST" });
    setSharingAll(false);
    if (!res.ok) {
      toast.error("Konnte Workouts nicht teilen.");
      return;
    }
    const data: { count: number } = await res.json();
    if (data.count === 0) {
      toast("Alle deine Workouts sind schon geteilt.");
    } else {
      toast.success(`${data.count} Workout${data.count === 1 ? "" : "s"} geteilt!`);
      refetch();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PostComposer groupId={groupId} alreadySharedIds={myAlreadySharedIds} onPosted={refetch} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-end"
        onClick={handleShareAll}
        disabled={sharingAll}
      >
        <Share2 className="size-3.5" />
        {sharingAll ? "Teile…" : "Alle Workouts teilen"}
      </Button>

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
