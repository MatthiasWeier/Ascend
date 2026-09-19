"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Dumbbell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";

type Session = {
  id: string;
  date: string;
  sets: { exercise: { name: string }; reps: number | null; weightKg: number | null; durationSec: number | null }[];
};

export type PostPayload =
  | { type: "TEXT"; content: string }
  | { type: "WORKOUT_SHARE"; workoutSessionId: string }
  | { type: "PHOTO"; file: File; caption: string };

export function PostComposer({
  alreadySharedIds,
  onSubmit,
}: {
  alreadySharedIds: Set<string>;
  onSubmit: (payload: PostPayload) => Promise<boolean>;
}) {
  const { t, dateLocale } = useLocale();
  const [mode, setMode] = useState<"TEXT" | "WORKOUT_SHARE" | "PHOTO">("TEXT");
  const [text, setText] = useState("");
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "WORKOUT_SHARE" && sessions == null) {
      fetch("/api/workouts")
        .then((r) => r.json())
        .then((data: { sessions: Session[] }) => {
          setSessions(data.sessions);
        });
    }
  }, [mode, sessions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "PHOTO" && !file) {
      toast.error(t("Bitte ein Bild wählen."));
      return;
    }
    if (mode === "WORKOUT_SHARE" && !sessionId) {
      toast.error(t("Bitte ein Workout wählen."));
      return;
    }
    if (mode === "TEXT" && !text.trim()) {
      toast.error(t("Text darf nicht leer sein."));
      return;
    }

    setLoading(true);
    const ok = await onSubmit(
      mode === "PHOTO"
        ? { type: "PHOTO", file: file!, caption }
        : mode === "WORKOUT_SHARE"
          ? { type: "WORKOUT_SHARE", workoutSessionId: sessionId }
          : { type: "TEXT", content: text.trim() }
    );
    setLoading(false);

    if (!ok) {
      toast.error(t("Konnte nicht posten."));
      return;
    }
    toast.success(t("Gepostet!"));
    if (mode === "PHOTO") {
      setFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (mode === "WORKOUT_SHARE") {
      setSessionId("");
    } else {
      setText("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList>
          <TabsTrigger value="TEXT">
            <MessageSquare className="size-3.5" />
            {t("Text")}
          </TabsTrigger>
          <TabsTrigger value="WORKOUT_SHARE">
            <Dumbbell className="size-3.5" />
            {t("Workout")}
          </TabsTrigger>
          <TabsTrigger value="PHOTO">
            <ImageIcon className="size-3.5" />
            {t("Foto")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "TEXT" && (
        <Textarea
          placeholder={t("Was gibt's Neues?")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {mode === "WORKOUT_SHARE" && (() => {
        const shareable = (sessions ?? []).filter((s) => !alreadySharedIds.has(s.id));
        return sessions != null && shareable.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
            {t("Alle deine Workouts sind bereits geteilt.")}
          </p>
        ) : (
          <Select value={sessionId} onValueChange={(v) => setSessionId(v as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("Workout wählen")} />
            </SelectTrigger>
            <SelectContent>
              {shareable.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {new Date(s.date).toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })} —{" "}
                  {t("{n} Sätze", { n: s.sets.length })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })()}

      {mode === "PHOTO" && (
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Textarea
            placeholder={t("Bildunterschrift (optional)…")}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="self-end">
        {loading ? t("Posten…") : t("Posten")}
      </Button>
    </form>
  );
}
