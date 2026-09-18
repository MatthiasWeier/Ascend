"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Image as ImageIcon, MessageSquare, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "@/components/feed-list";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { PostComposer } from "@/components/groups/post-composer";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { REACTION_EMOJIS } from "@/lib/post-reactions";

const TYPE_FILTERS = [
  { value: "ALL" as const, label: "Alle", icon: null },
  { value: "TEXT" as const, label: "Text", icon: MessageSquare },
  { value: "WORKOUT_SHARE" as const, label: "Workout", icon: Dumbbell },
  { value: "PHOTO" as const, label: "Foto", icon: ImageIcon },
];
type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];

type Post = {
  id: string;
  type: "PHOTO" | "WORKOUT_SHARE" | "TEXT";
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  workoutSessionId: string | null;
  user: { id: string; name: string };
  reactionCounts: Record<string, number>;
  myReaction: string | null;
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [authorFilter, setAuthorFilter] = useState<{ id: string; name: string } | null>(null);

  function refetch() {
    return fetch(`/api/groups/${groupId}/posts`)
      .then((r) => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts));
  }

  useEffect(() => {
    refetch();
  }, [groupId]);

  const myAlreadySharedIds = useMemo(() => {
    const myUserId = authSession?.user?.id;
    return new Set(
      (posts ?? [])
        .filter((p) => p.workoutSessionId != null && p.user.id === myUserId)
        .map((p) => p.workoutSessionId as string)
    );
  }, [posts, authSession]);

  const visiblePosts = useMemo(() => {
    return (posts ?? []).filter(
      (p) =>
        (typeFilter === "ALL" || p.type === typeFilter) &&
        (authorFilter == null || p.user.id === authorFilter.id)
    );
  }, [posts, typeFilter, authorFilter]);

  async function handleReact(postId: string, emoji: string) {
    const post = posts?.find((p) => p.id === postId);
    const removing = post?.myReaction === emoji;
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}/reactions`, {
      method: removing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: removing ? undefined : JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      toast.error("Konnte Reaktion nicht speichern.");
      return;
    }
    refetch();
  }

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
    <PullToRefresh onRefresh={refetch}>
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

      <div className="flex flex-wrap items-center gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              typeFilter === f.value
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            {f.icon && <f.icon className="size-3" />}
            {f.label}
          </button>
        ))}
        {authorFilter && (
          <button
            type="button"
            onClick={() => setAuthorFilter(null)}
            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            Nur {authorFilter.name}
            <X className="size-3" />
          </button>
        )}
      </div>

      {posts == null ? (
        <Skeleton className="h-32 w-full" />
      ) : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Noch nichts gepostet. Sei der Erste!
        </p>
      ) : visiblePosts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nichts mit diesem Filter.
        </p>
      ) : (
        <FeedList>
          {visiblePosts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex flex-col gap-2 px-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setAuthorFilter({ id: post.user.id, name: post.user.name })}
                    className="font-medium text-foreground hover:underline"
                  >
                    {post.user.name}
                  </button>
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

                <div className="flex flex-wrap items-center gap-1">
                  {REACTION_EMOJIS.map((emoji) => {
                    const count = post.reactionCounts[emoji] ?? 0;
                    const active = post.myReaction === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReact(post.id, emoji)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                          active
                            ? "border-primary/40 bg-primary/15"
                            : "border-border bg-transparent hover:bg-secondary"
                        )}
                      >
                        {emoji}
                        {count > 0 && <span className="text-muted-foreground">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </FeedList>
      )}
    </div>
    </PullToRefresh>
  );
}
