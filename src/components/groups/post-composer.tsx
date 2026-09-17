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

type Session = {
  id: string;
  date: string;
  sets: { exercise: { name: string }; reps: number | null; weightKg: number | null; durationSec: number | null }[];
};

function summarizeSession(s: Session) {
  const date = new Date(s.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  const lines = s.sets.map(
    (set) =>
      `${set.exercise.name}: ${
        set.durationSec != null ? `${set.durationSec}s` : `${set.reps ?? "-"}×${set.weightKg ?? 0}kg`
      }`
  );
  return `Workout vom ${date}\n${lines.join("\n")}`;
}

export function PostComposer({ groupId, onPosted }: { groupId: string; onPosted: () => void }) {
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
          if (data.sessions.length > 0) setSessionId(data.sessions[0].id);
        });
    }
  }, [mode, sessions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "PHOTO") {
        if (!file) {
          toast.error("Bitte ein Bild wählen.");
          return;
        }
        const form = new FormData();
        form.append("image", file);
        form.append("caption", caption);
        const res = await fetch(`/api/groups/${groupId}/posts`, { method: "POST", body: form });
        if (!res.ok) throw new Error();
        setFile(null);
        setCaption("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else if (mode === "WORKOUT_SHARE") {
        const session = sessions?.find((s) => s.id === sessionId);
        if (!session) {
          toast.error("Kein Workout gefunden.");
          return;
        }
        const res = await fetch(`/api/groups/${groupId}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "WORKOUT_SHARE", content: summarizeSession(session) }),
        });
        if (!res.ok) throw new Error();
      } else {
        if (!text.trim()) {
          toast.error("Text darf nicht leer sein.");
          return;
        }
        const res = await fetch(`/api/groups/${groupId}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "TEXT", content: text.trim() }),
        });
        if (!res.ok) throw new Error();
        setText("");
      }
      toast.success("Gepostet!");
      onPosted();
    } catch {
      toast.error("Konnte nicht posten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList>
          <TabsTrigger value="TEXT">
            <MessageSquare className="size-3.5" />
            Text
          </TabsTrigger>
          <TabsTrigger value="WORKOUT_SHARE">
            <Dumbbell className="size-3.5" />
            Workout
          </TabsTrigger>
          <TabsTrigger value="PHOTO">
            <ImageIcon className="size-3.5" />
            Foto
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "TEXT" && (
        <Textarea
          placeholder="Was gibt's Neues?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {mode === "WORKOUT_SHARE" && (
        <Select value={sessionId} onValueChange={(v) => setSessionId(v as string)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Workout wählen" />
          </SelectTrigger>
          <SelectContent>
            {(sessions ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {new Date(s.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} —{" "}
                {s.sets.length} Sätze
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
            placeholder="Bildunterschrift (optional)…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="self-end">
        {loading ? "Posten…" : "Posten"}
      </Button>
    </form>
  );
}
