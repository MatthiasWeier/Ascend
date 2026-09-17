"use client";

import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "@/components/feed-list";
import { PostComposer } from "@/components/groups/post-composer";

type Post = {
  id: string;
  type: "PHOTO" | "WORKOUT_SHARE" | "TEXT";
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  user: { id: string; name: string };
};

export function GroupFeed({ groupId }: { groupId: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);

  function refetch() {
    fetch(`/api/groups/${groupId}/posts`)
      .then((r) => r.json())
      .then((data: { posts: Post[] }) => setPosts(data.posts));
  }

  useEffect(refetch, [groupId]);

  return (
    <div className="flex flex-col gap-4">
      <PostComposer groupId={groupId} onPosted={refetch} />

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
