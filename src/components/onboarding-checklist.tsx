import Link from "next/link";
import { Check, Scale, Dumbbell, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";

type Step = {
  href: string;
  label: string;
  description: string;
  icon: typeof Scale;
  done: boolean;
};

export async function OnboardingChecklist({
  hasBodyWeight,
  hasGroup,
}: {
  hasBodyWeight: boolean;
  hasGroup: boolean;
}) {
  const { t } = await getT();
  const steps: Step[] = [
    {
      href: "/dashboard/settings",
      label: t("Körpergewicht eintragen"),
      description: t("Für korrekt bewertete Bodyweight-Übungen wie Klimmzüge"),
      icon: Scale,
      done: hasBodyWeight,
    },
    {
      href: "/dashboard/workouts/new",
      label: t("Erstes Workout eintragen"),
      description: t("Übung wählen, Sätze eintragen, fertig"),
      icon: Dumbbell,
      done: false,
    },
    {
      href: "/dashboard/groups",
      label: t("Gruppe erstellen oder beitreten"),
      description: t("Gemeinsame Ziele, Feed und Challenges mit Freunden"),
      icon: Users,
      done: hasGroup,
    },
  ];

  return (
    <div className="rounded-xl border border-dashed border-border p-4">
      <p className="mb-3 text-sm font-semibold">{t("So geht's los")}</p>
      <div className="flex flex-col gap-1">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50",
              step.done && "opacity-60"
            )}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
              )}
            >
              {step.done ? <Check className="size-4" /> : <step.icon className="size-4" />}
            </div>
            <div>
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
