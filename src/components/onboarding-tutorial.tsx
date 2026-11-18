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
      title: t("Welcome to Ascend 👋"),
      body: t("Your tracker for strength and climbing - solo or with friends. This short tour shows you where everything is."),
    },
    {
      icon: PlusCircle,
      title: t("Log workout"),
      body: t("This is where you record every training session."),
      bullets: [
        t("Pick an exercise, enter reps and weight"),
        t("\"Set & rest\" starts the rest timer automatically"),
        t("Templates save time on routine workouts"),
        t("Your draft is saved automatically - even if you briefly switch apps"),
      ],
      where: { icon: PlusCircle, label: t("Log") },
    },
    {
      icon: Camera,
      title: t("Pump pics, notes & records"),
      body: t("Make the workout your own."),
      bullets: [
        t("Attach up to 10 photos to a workout"),
        t("Rate how fatigued the muscle groups were"),
        t("New personal bests are celebrated as a 🏆 PR"),
      ],
      where: { icon: PlusCircle, label: t("Log") },
    },
    {
      icon: LayoutDashboard,
      title: t("Your feed"),
      body: t("The home page shows your workouts and your groups' posts in one place."),
      bullets: [
        t("Filter by group, workouts, messages or images"),
        t("Click a workout for details or to edit it"),
        t("Comment and react to posts"),
      ],
      where: { icon: LayoutDashboard, label: t("Feed") },
    },
    {
      icon: CalendarDays,
      title: t("Calendar & streak"),
      body: t("The activity calendar colours every training day - click one to see the workout."),
      bullets: [
        t("You'll see your streak at the top of the home page"),
        t("In Settings you can subscribe to the calendar as a feed in Google or Apple Calendar"),
      ],
      where: { icon: BarChart3, label: t("Analytics") },
    },
    {
      icon: BarChart3,
      title: t("Analytics"),
      body: t("See how you're progressing."),
      bullets: [
        t("Strength: progress of every exercise"),
        t("Records, volume and muscle group balance"),
        t("Climbing: skin condition and load"),
      ],
      where: { icon: BarChart3, label: t("Analytics") },
    },
    {
      icon: Brain,
      title: t("Workout Brain"),
      body: t("The card on the home page suggests what to train next - so no muscle group gets neglected."),
      where: { icon: LayoutDashboard, label: t("Feed") },
    },
    {
      icon: PersonStanding,
      title: t("Body & muscles"),
      body: t("A rotatable 3D figure shows how much you've trained each muscle lately - grey is little, red is a lot."),
      bullets: [
        t("Tap a muscle and say whether you want to train it more - the Workout Brain will then suggest it more often"),
        t("Enter injuries in Settings: affected exercises are flagged and no longer suggested"),
      ],
      where: { icon: PersonStanding, label: t("Body") },
    },
    {
      icon: Users,
      title: t("Groups"),
      body: t("Create a group or join via an invite link."),
      bullets: [
        t("Feed with messages, photos and shared workouts"),
        t("Share workouts one by one or automatically with the group"),
        t("Shared goals, analytics and member list"),
      ],
      where: { icon: Users, label: t("Groups") },
    },
    {
      icon: Trophy,
      title: t("Challenges & group goals"),
      body: t("Motivation for everyone."),
      bullets: [
        t("Daily challenges: everyone sets their own rep target for the day"),
        t("Reps from your workouts count automatically"),
        t("Group goals like \"10,000 push-ups in September\" fill themselves up"),
      ],
      where: { icon: Users, label: t("Groups") },
    },
    {
      icon: Bell,
      title: t("Notifications"),
      body: t("The bell at the top shows comments, reactions and completed challenges. You can enable push notifications on your phone in Settings."),
      where: { icon: Bell, label: t("Bell, top right") },
    },
    {
      icon: Settings,
      title: t("Settings"),
      body: t("Adapt Ascend to you."),
      bullets: [
        t("Body weight - for correctly rated bodyweight exercises"),
        t("Unit kg/lb, language German/English, light/dark"),
        t("Export, import, two-factor login and more"),
      ],
      where: { icon: Settings, label: t("Settings") },
    },
    {
      icon: Rocket,
      title: t("Let's go!"),
      body: t("The best way to start is with your first workout. You can find this tour again in Settings at any time."),
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
              {t("Find it:")}
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
                {t("Skip")}
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => setIndex(index - 1)}>
                {t("Back")}
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
                {t("Log your first workout")}
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setIndex(index + 1)}>
                {t("Next")}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("Step {n} of {total}", { n: index + 1, total: steps.length })}</span>
            {isLast ? (
              <button type="button" className="underline-offset-2 hover:underline" onClick={close}>
                {t("Done")}
              </button>
            ) : (
              !isFirst && (
                <button type="button" className="underline-offset-2 hover:underline" onClick={close}>
                  {t("Skip")}
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
      {t("Watch tutorial again")}
    </Button>
  );
}
