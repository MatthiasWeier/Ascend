"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Dumbbell, Image as ImageIcon, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FeedList } from "@/components/feed-list";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { PostComposer, type PostPayload } from "@/components/groups/post-composer";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { undoableAction } from "@/lib/undo-toast";
import { REACTION_EMOJIS } from "@/lib/post-reactions";
import { useLocale } from "@/components/locale-provider";
import { FOCUS_LABEL } from "@/lib/muscle-focus";
import { PostComments } from "@/components/groups/post-comments";
import { ImageLightbox } from "@/components/image-lightbox";

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
  reactionUsers: Record<string, string[]>;
  myReaction: string | null;
  pending?: boolean;
  focuses?: string[];
  commentCount?: number;
  photoIds?: string[];
};

// Shared workouts are stored as a text summary ("Workout vom ...", then one
// "Exercise: reps×weight" line per set). Show a one-line summary first and
// the full set list only on demand - long workouts otherwise dominate the feed.
function SharedWorkoutBody({
  content,
  focuses = [],
  photoIds = [],
}: {
  content: string;
  focuses?: string[];
  photoIds?: string[];
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [header, ...lines] = content.split("\n");
  const exercises = new Set(lines.map((l) => l.split(":")[0].trim()).filter(Boolean)).size;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left text-sm"
      >
        <span>
          <span className="font-medium">
            {header.replace(/^Workout vom (.+)$/, (_, date: string) => t("Workout vom {date}", { date }))}
          </span>
          {exercises > 0 && (
            <span className="text-muted-foreground">
              {" · "}
              {exercises === 1 ? t("1 Übung") : t("{n} Übungen", { n: exercises })}
              {" · "}
              {lines.length === 1 ? t("1 Satz") : t("{n} Sätze", { n: lines.length })}
              {focuses.length > 0 &&
                ` · ${focuses
                  .map((f) => t("{focus}-Fokus", { focus: t((FOCUS_LABEL as Record<string, string>)[f] ?? f) }))
                  .join(", ")}`}
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {open ? t("Details ausblenden") : t("Details einblenden")}
        </span>
      </button>
      {photoIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photoIds.map((id) => (
            <ImageLightbox key={id} src={`/api/workout-photos/${id}`} alt={t("Pump Pic")} thumbClassName="max-h-40 max-w-56" />
          ))}
        </div>
      )}
      {open && <pre className="whitespace-pre-wrap font-sans text-sm">{lines.join("\n")}</pre>}
    </div>
  );
}

export function GroupFeed({
  groupId,
  initialAutoShare,
  isLeader,
}: {
  groupId: string;
  initialAutoShare: boolean;
  isLeader: boolean;
}) {
  const { data: authSession } = useSession();
  const { t, dateLocale } = useLocale();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [autoShare, setAutoShare] = useState(initialAutoShare);
  const [togglingAutoShare, setTogglingAutoShare] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [authorFilter, setAuthorFilter] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
    const previousPosts = posts;
    const post = posts?.find((p) => p.id === postId);
    if (!post) return;
    const removing = post.myReaction === emoji;

    const myName = authSession?.user?.name ?? "";
    setPosts(
      (posts ?? []).map((p) => {
        if (p.id !== postId) return p;
        const counts = { ...p.reactionCounts };
        const users = { ...p.reactionUsers };
        if (p.myReaction) {
          counts[p.myReaction] = Math.max(0, (counts[p.myReaction] ?? 0) - 1);
          users[p.myReaction] = (users[p.myReaction] ?? []).filter((n) => n !== myName);
        }
        if (!removing) {
          counts[emoji] = (counts[emoji] ?? 0) + 1;
          users[emoji] = [...(users[emoji] ?? []), myName];
        }
        return { ...p, reactionCounts: counts, reactionUsers: users, myReaction: removing ? null : emoji };
      })
    );

    const res = await fetch(`/api/groups/${groupId}/posts/${postId}/reactions`, {
      method: removing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: removing ? undefined : JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      setPosts(previousPosts);
      toast.error(t("Konnte Reaktion nicht speichern."));
    }
  }

  async function handleCreatePost(payload: PostPayload): Promise<boolean> {
    const tempId = `temp-${Date.now()}`;
    const objectUrl = payload.type === "PHOTO" ? URL.createObjectURL(payload.file) : null;
    const optimisticPost: Post = {
      id: tempId,
      type: payload.type,
      content:
        payload.type === "TEXT"
          ? payload.content
          : payload.type === "PHOTO"
            ? payload.caption || null
            : t("Workout wird geteilt…"),
      imageUrl: objectUrl,
      createdAt: new Date().toISOString(),
      workoutSessionId: payload.type === "WORKOUT_SHARE" ? payload.workoutSessionId : null,
      user: { id: authSession?.user?.id ?? "me", name: authSession?.user?.name ?? "" },
      reactionCounts: {},
      reactionUsers: {},
      myReaction: null,
      pending: true,
    };
    setPosts((prev) => [optimisticPost, ...(prev ?? [])]);

    let res: Response;
    if (payload.type === "PHOTO") {
      const form = new FormData();
      form.append("image", payload.file);
      form.append("caption", payload.caption);
      res = await fetch(`/api/groups/${groupId}/posts`, { method: "POST", body: form });
    } else if (payload.type === "WORKOUT_SHARE") {
      res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WORKOUT_SHARE", workoutSessionId: payload.workoutSessionId }),
      });
    } else {
      res = await fetch(`/api/groups/${groupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TEXT", content: payload.content }),
      });
    }

    if (!res.ok) {
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== tempId));
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return false;
    }
    await refetch();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return true;
  }

  function handleDeletePost(postId: string) {
    const index = posts?.findIndex((p) => p.id === postId) ?? -1;
    if (index === -1 || !posts) return;
    const post = posts[index];
    setPosts((prev) => (prev ?? []).filter((p) => p.id !== postId));

    undoableAction({
      message: t("Beitrag gelöscht."),
      undoLabel: t("Rückgängig"),
      onCommit: () => {
        fetch(`/api/groups/${groupId}/posts/${postId}`, { method: "DELETE" }).catch(() => {});
      },
      onUndo: () => {
        setPosts((prev) => {
          const next = [...(prev ?? [])];
          next.splice(index, 0, post);
          return next;
        });
      },
    });
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditDraft(post.content ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(postId: string) {
    if (!editDraft.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/groups/${groupId}/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editDraft.trim() }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      toast.error(t("Konnte Beitrag nicht speichern."));
      return;
    }
    setPosts((prev) =>
      (prev ?? []).map((p) => (p.id === postId ? { ...p, content: editDraft.trim() } : p))
    );
    setEditingId(null);
    setEditDraft("");
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
      toast.error(t("Konnte Einstellung nicht ändern."));
      return;
    }
    const data: { enabled: boolean; sharedCount: number } = await res.json();
    setAutoShare(data.enabled);
    if (!data.enabled) {
      toast(t("Automatisches Teilen aus."));
      return;
    }
    toast.success(
      data.sharedCount > 0
        ? data.sharedCount === 1
          ? t("Automatisches Teilen an - 1 Workout nachgetragen.")
          : t("Automatisches Teilen an - {n} Workouts nachgetragen.", { n: data.sharedCount })
        : t("Automatisches Teilen an.")
    );
    refetch();
  }

  return (
    <PullToRefresh onRefresh={refetch}>
    <div className="flex flex-col gap-4">
      <PostComposer alreadySharedIds={myAlreadySharedIds} onSubmit={handleCreatePost} />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium">{t("Workouts automatisch teilen")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Jedes neue Workout landet automatisch hier im Feed - inklusive aller bisherigen.")}
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
            {t(f.label)}
          </button>
        ))}
        {authorFilter && (
          <button
            type="button"
            onClick={() => setAuthorFilter(null)}
            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
          >
            {t("Nur {name}", { name: authorFilter.name })}
            <X className="size-3" />
          </button>
        )}
      </div>

      {posts == null ? (
        <Skeleton className="h-32 w-full" />
      ) : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("Noch nichts gepostet. Sei der Erste!")}
        </p>
      ) : visiblePosts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("Nichts mit diesem Filter.")}
        </p>
      ) : (
        <FeedList>
          {visiblePosts.map((post) => {
            const isOwn = post.user.id === authSession?.user?.id;
            const canDelete = !post.pending && (isOwn || (isLeader && post.type !== "WORKOUT_SHARE"));
            const canEdit = !post.pending && isOwn && post.type !== "WORKOUT_SHARE";
            const isEditing = editingId === post.id;
            return (
            <Card key={post.id} className={cn(post.pending && "opacity-60")}>
              <CardContent className="flex flex-col gap-2 px-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setAuthorFilter({ id: post.user.id, name: post.user.name })}
                    className="font-medium text-foreground hover:underline"
                  >
                    {post.user.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <span>
                      {post.pending
                        ? t("Wird gepostet…")
                        : new Date(post.createdAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {canEdit && !isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-5 text-muted-foreground"
                        title={t("Bearbeiten")}
                        onClick={() => startEdit(post)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-5 text-muted-foreground hover:text-destructive"
                        title={t("Löschen")}
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {post.type === "PHOTO" && post.imageUrl && (
                  <ImageLightbox src={post.imageUrl} alt={post.content ?? t("Foto")} />
                )}

                {post.type === "WORKOUT_SHARE" && (
                  <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                    <Dumbbell className="mt-0.5 size-4 shrink-0 text-primary" />
                    <SharedWorkoutBody content={post.content ?? ""} focuses={post.focuses} photoIds={post.photoIds} />
                  </div>
                )}

                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      autoFocus
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" disabled={savingEdit} onClick={() => saveEdit(post.id)}>
                        <Check className="size-3.5" />
                        {savingEdit ? t("Speichern…") : t("Speichern")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                        {t("Abbrechen")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  post.content &&
                  post.type !== "WORKOUT_SHARE" && <p className="text-sm">{post.content}</p>
                )}

                <div className={cn("flex flex-wrap items-center gap-1", post.pending && "pointer-events-none")}>
                  {REACTION_EMOJIS.map((emoji) => {
                    const count = post.reactionCounts[emoji] ?? 0;
                    const active = post.myReaction === emoji;
                    const reactors = post.reactionUsers[emoji] ?? [];
                    const button = (
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
                    if (reactors.length === 0) return button;
                    return (
                      <Tooltip key={emoji}>
                        <TooltipTrigger render={button} />
                        <TooltipContent>{reactors.join(", ")}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                {!post.pending && (
                  <PostComments
                    groupId={groupId}
                    postId={post.id}
                    initialCount={post.commentCount ?? 0}
                    isLeader={isLeader}
                  />
                )}
              </CardContent>
            </Card>
            );
          })}
        </FeedList>
      )}
    </div>
    </PullToRefresh>
  );
}
