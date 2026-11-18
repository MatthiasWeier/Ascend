"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/components/locale-provider";
import { formatTimeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

type PostComment = {
  id: string;
  parentId: string | null;
  content: string;
  deleted: boolean;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; name: string } | null;
};

const MAX_INDENT_DEPTH = 5;

// Reddit-style thread under a group post: nested replies, per-comment
// collapse, edit/delete for your own, delete for the leader.
export function PostComments({
  groupId,
  postId,
  initialCount,
  isLeader,
  label,
  focusCommentId,
}: {
  groupId: string;
  postId: string;
  initialCount: number;
  isLeader: boolean;
  label?: string;
  // Opens the thread and scrolls to this comment (notification deep link).
  focusCommentId?: string;
}) {
  const { t, dateLocale } = useLocale();
  const { data: authSession } = useSession();
  const myId = authSession?.user?.id;

  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const base = `/api/groups/${groupId}/posts/${postId}/comments`;
  const count = comments ? comments.filter((c) => !c.deleted).length : initialCount;

  function loadComments() {
    fetch(base)
      .then((r) => r.json())
      .then((data: { comments: PostComment[] }) => setComments(data.comments));
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && comments == null) loadComments();
  }

  useEffect(() => {
    if (!focusCommentId) return;
    setOpen(true);
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCommentId]);

  useEffect(() => {
    if (!focusCommentId || !comments?.some((c) => c.id === focusCommentId)) return;
    setHighlightId(focusCommentId);
    const scroll = setTimeout(() => {
      document.getElementById(`comment-${focusCommentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    const clear = setTimeout(() => setHighlightId(null), 3500);
    return () => {
      clearTimeout(scroll);
      clearTimeout(clear);
    };
  }, [focusCommentId, comments]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, PostComment[]>();
    for (const c of comments ?? []) {
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [comments]);

  function countDescendants(id: string): number {
    return (childrenOf.get(id) ?? []).reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
  }

  async function submit(content: string, parentId: string | null): Promise<boolean> {
    setPosting(true);
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: parentId ?? undefined }),
    });
    setPosting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't save the comment."));
      return false;
    }
    const data: { comment: PostComment } = await res.json();
    setComments((prev) => [...(prev ?? []), data.comment]);
    return true;
  }

  async function saveEdit(id: string) {
    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editDraft }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't save the comment."));
      return;
    }
    const data: { content: string; editedAt: string } = await res.json();
    setComments((prev) =>
      (prev ?? []).map((c) => (c.id === id ? { ...c, content: data.content, editedAt: data.editedAt } : c))
    );
    setEditingId(null);
  }

  async function remove(id: string) {
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(t(data.error ?? "Couldn't delete the comment."));
      return;
    }
    toast.success(t("Comment deleted."));
    const fresh = await fetch(base).then((r) => r.json());
    setComments(fresh.comments);
  }

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(c: PostComment, depth: number): React.ReactNode {
    const replies = childrenOf.get(c.id) ?? [];
    const isCollapsed = collapsed.has(c.id);
    const canEdit = !c.deleted && c.user?.id === myId;
    const canDelete = !c.deleted && (c.user?.id === myId || isLeader);
    const hidden = countDescendants(c.id);

    return (
      <div key={c.id} className="flex flex-col gap-1.5">
        <div
          id={`comment-${c.id}`}
          className={cn("flex flex-col gap-1 rounded-lg bg-secondary/30 px-3 py-2 transition-shadow", highlightId === c.id && "ring-2 ring-primary")}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => toggleCollapsed(c.id)}
              aria-label={isCollapsed ? t("Expand") : t("Collapse")}
              className="font-mono hover:text-foreground"
            >
              [{isCollapsed ? "+" : "–"}]
            </button>
            <span className="font-medium text-foreground">{c.deleted ? t("[deleted]") : c.user?.name}</span>
            <span>{formatTimeAgo(c.createdAt, t, dateLocale)}</span>
            {c.editedAt && !c.deleted && <span>· {t("edited")}</span>}
            {isCollapsed && hidden > 0 && (
              <span>· {hidden === 1 ? t("1 reply") : t("{n} replies", { n: hidden })}</span>
            )}
          </div>

          {!isCollapsed && (
            <>
              {c.deleted ? (
                <p className="text-sm italic text-muted-foreground">{t("[deleted]")}</p>
              ) : editingId === c.id ? (
                <div className="flex flex-col gap-2">
                  <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} autoFocus className="text-sm" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={!editDraft.trim()} onClick={() => saveEdit(c.id)}>
                      {t("Save")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
              )}

              {!c.deleted && editingId !== c.id && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <button type="button" className="hover:text-foreground" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyDraft(""); }}>
                    {t("Reply")}
                  </button>
                  {canEdit && (
                    <button type="button" className="hover:text-foreground" onClick={() => { setEditingId(c.id); setEditDraft(c.content); }}>
                      {t("Edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="hover:text-destructive" onClick={() => remove(c.id)}>
                      {t("Delete")}
                    </button>
                  )}
                </div>
              )}

              {replyTo === c.id && (
                <div className="flex flex-col gap-2 pt-1">
                  <Textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder={t("Write a reply…")}
                    autoFocus
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={posting || !replyDraft.trim()}
                      onClick={async () => {
                        if (await submit(replyDraft.trim(), c.id)) {
                          setReplyTo(null);
                          setReplyDraft("");
                        }
                      }}
                    >
                      {t("Reply")}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReplyTo(null)}>
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!isCollapsed && replies.length > 0 && (
          <div className={depth < MAX_INDENT_DEPTH ? "ml-3 flex flex-col gap-1.5 border-l border-border pl-3" : "flex flex-col gap-1.5"}>
            {replies.map((r) => renderNode(r, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const roots = childrenOf.get(null) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex min-h-9 w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <MessageCircle className="size-4" />
        {label && <span className="text-foreground">{label} ·</span>}
        {count === 0 ? t("Comment") : count === 1 ? t("1 comment") : t("{n} comments", { n: count })}
      </button>

      {open && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("Write a comment…")}
              maxLength={2000}
              className="text-sm"
            />
            <Button
              type="button"
              size="sm"
              className="self-end"
              disabled={posting || !draft.trim()}
              onClick={async () => {
                if (await submit(draft.trim(), null)) setDraft("");
              }}
            >
              {posting ? t("Posting…") : t("Comment")}
            </Button>
          </div>

          {comments == null ? (
            <Skeleton className="h-16 w-full" />
          ) : roots.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("No comments yet. Be the first!")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">{roots.map((c) => renderNode(c, 0))}</div>
          )}
        </div>
      )}
    </div>
  );
}
