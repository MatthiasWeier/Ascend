"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Brain,
  CalendarDays,
  Camera,
  LayoutDashboard,
  Mountain,
  PersonStanding,
  PlusCircle,
  Rocket,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export const OPEN_TUTORIAL_EVENT = "ascend:open-tutorial";

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  bullets?: string[];
  // Where to find it in the app.
  where?: { icon: LucideIcon; label: string };
};

// German text is the i18n key - keep these literal so the check script sees them.
function useSteps(): Step[] {
  const t = useT();
  return [
    {
      icon: Mountain,
      title: t("Willkommen bei Ascend 👋"),
      body: t("Dein Tracker für Kraft und Klettern - allein oder mit Freunden. Die kurze Tour zeigt dir, wo du was findest."),
    },
    {
      icon: PlusCircle,
      title: t("Workout eintragen"),
      body: t("Hier hältst du jedes Training fest."),
      bullets: [
        t("Übung wählen, Wiederholungen und Gewicht eintragen"),
        t("Mit „Satz & Pause“ startet automatisch der Pausen-Timer"),
        t("Vorlagen sparen Zeit bei Routine-Workouts"),
        t("Dein Entwurf wird automatisch gespeichert - auch wenn du kurz die App wechselst"),
      ],
      where: { icon: PlusCircle, label: t("Eintragen") },
    },
    {
      icon: Camera,
      title: t("Pump Pics, Notizen & Rekorde"),
      body: t("Mach dein Workout persönlich."),
      bullets: [
        t("Hänge bis zu 10 Fotos an ein Workout"),
        t("Bewerte, wie ausgelastet die Muskelgruppen waren"),
        t("Neue Bestleistungen werden als 🏆 PR gefeiert"),
      ],
      where: { icon: PlusCircle, label: t("Eintragen") },
    },
    {
      icon: LayoutDashboard,
      title: t("Dein Feed"),
      body: t("Auf der Startseite siehst du deine Workouts und die Beiträge deiner Gruppen an einem Ort."),
      bullets: [
        t("Filtere nach Gruppe, Workouts, Nachrichten oder Bildern"),
        t("Klick auf ein Workout für Details oder zum Bearbeiten"),
        t("Kommentiere und reagiere auf Beiträge"),
      ],
      where: { icon: LayoutDashboard, label: t("Feed") },
    },
    {
      icon: CalendarDays,
      title: t("Kalender & Streak"),
      body: t("Der Aktivitätskalender färbt jeden Trainingstag ein - ein Klick zeigt das Workout."),
      bullets: [
        t("Deinen Streak siehst du oben auf der Startseite"),
        t("Den Kalender kannst du in den Einstellungen als Kalender-Feed in Google oder Apple Kalender abonnieren"),
      ],
      where: { icon: BarChart3, label: t("Analytics") },
    },
    {
      icon: BarChart3,
      title: t("Analytics"),
      body: t("Sieh, wie du dich entwickelst."),
      bullets: [
        t("Kraft: Verlauf jeder Übung"),
        t("Rekorde, Volumen und Balance der Muskelgruppen"),
        t("Klettern: Haut-Zustand und Belastung"),
      ],
      where: { icon: BarChart3, label: t("Analytics") },
    },
    {
      icon: Brain,
      title: t("Workout Brain"),
      body: t("Die Karte auf der Startseite schlägt vor, was du als Nächstes trainieren solltest - damit keine Muskelgruppe zu kurz kommt."),
      where: { icon: LayoutDashboard, label: t("Feed") },
    },
    {
      icon: PersonStanding,
      title: t("Körper & Muskeln"),
      body: t("Eine drehbare 3D-Figur zeigt, welche Muskeln du zuletzt wie stark trainiert hast - grau ist wenig, rot ist viel."),
      bullets: [
        t("Tippe einen Muskel an und sag, ob du ihn öfter trainieren willst - das Workout Brain schlägt ihn dann öfter vor"),
        t("Verletzungen trägst du in den Einstellungen ein: betroffene Übungen werden gewarnt und nicht mehr vorgeschlagen"),
      ],
      where: { icon: PersonStanding, label: t("Körper") },
    },
    {
      icon: Users,
      title: t("Gruppen"),
      body: t("Erstelle eine Gruppe oder tritt per Einladungslink bei."),
      bullets: [
        t("Feed mit Nachrichten, Fotos und geteilten Workouts"),
        t("Workouts einzeln teilen oder automatisch in der Gruppe teilen"),
        t("Gemeinsame Ziele, Analytics und Mitgliederliste"),
      ],
      where: { icon: Users, label: t("Gruppen") },
    },
    {
      icon: Trophy,
      title: t("Challenges & Gruppenziele"),
      body: t("Motivation für alle."),
      bullets: [
        t("Daily Challenges: Jeder setzt sein Wiederholungs-Ziel für den Tag"),
        t("Wiederholungen aus deinen Workouts zählen automatisch mit"),
        t("Gruppenziele wie \"10.000 Liegestütze im September\" füllen sich von selbst"),
      ],
      where: { icon: Users, label: t("Gruppen") },
    },
    {
      icon: Bell,
      title: t("Benachrichtigungen"),
      body: t("Die Glocke oben zeigt Kommentare, Reaktionen und geschaffte Challenges. Push-Nachrichten aufs Handy aktivierst du in den Einstellungen."),
      where: { icon: Bell, label: t("Glocke oben rechts") },
    },
    {
      icon: Settings,
      title: t("Einstellungen"),
      body: t("Passe Ascend an dich an."),
      bullets: [
        t("Körpergewicht - für korrekt bewertete Bodyweight-Übungen"),
        t("Einheit kg/lb, Sprache Deutsch/English, Hell/Dunkel"),
        t("Export, Import, Zwei-Faktor-Login und mehr"),
      ],
      where: { icon: Settings, label: t("Einstellungen") },
    },
    {
      icon: Rocket,
      title: t("Los geht's!"),
      body: t("Am besten startest du direkt mit deinem ersten Workout. Diese Tour findest du jederzeit in den Einstellungen wieder."),
    },
  ];
}

export function OnboardingTutorial({ initialOpen }: { initialOpen: boolean }) {
  const t = useT();
  const router = useRouter();
  const steps = useSteps();
  const [open, setOpen] = useState(initialOpen);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TUTORIAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, onOpen);
  }, []);

  // Skipping, finishing and closing all count as "seen" - it only ever
  // auto-opens once per account. The server keeps the first timestamp.
  function close() {
    setOpen(false);
    fetch("/api/account/tutorial", { method: "POST", keepalive: true }).catch(() => {});
  }

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()} disablePointerDismissal>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md" showCloseButton={false}>
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <step.icon className="size-8" />
          </div>
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-lg">{step.title}</DialogTitle>
            <DialogDescription className="text-balance">{step.body}</DialogDescription>
          </div>

          {step.bullets && (
            <ul className="flex w-full flex-col gap-1.5 rounded-lg bg-secondary/50 p-3 text-left text-sm">
              {step.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {step.where && (
            <p className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {t("Zu finden:")}
              <step.where.icon className="size-3.5" />
              <span className="font-medium text-foreground">{step.where.label}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30")}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {isFirst ? (
              <Button variant="ghost" className="flex-1" onClick={close}>
                {t("Überspringen")}
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => setIndex(index - 1)}>
                {t("Zurück")}
              </Button>
            )}
            {isLast ? (
              <Button
                className="flex-1"
                onClick={() => {
                  close();
                  router.push("/dashboard/workouts/new");
                }}
              >
                {t("Erstes Workout eintragen")}
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setIndex(index + 1)}>
                {t("Weiter")}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("Schritt {n} von {total}", { n: index + 1, total: steps.length })}</span>
            {isLast ? (
              <button type="button" className="underline-offset-2 hover:underline" onClick={close}>
                {t("Fertig")}
              </button>
            ) : (
              !isFirst && (
                <button type="button" className="underline-offset-2 hover:underline" onClick={close}>
                  {t("Überspringen")}
                </button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Settings entry to replay the tour.
export function ReplayTutorialButton() {
  const t = useT();
  return (
    <Button variant="outline" onClick={() => window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT))}>
      {t("Tutorial erneut ansehen")}
    </Button>
  );
}
