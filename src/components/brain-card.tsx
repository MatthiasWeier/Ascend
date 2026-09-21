import { BedDouble, Hand, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BrainSuggestion } from "@/lib/workout-brain";
import { getT } from "@/lib/i18n/server";

export async function BrainCard({ suggestion }: { suggestion: BrainSuggestion }) {
  const { t } = await getT();
  const Icon = suggestion.isOverloaded ? BedDouble : suggestion.isSwap ? Hand : Sparkles;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card py-0">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Workout Brain
          </p>
          <p className="text-lg font-semibold leading-tight">{suggestion.headline}</p>
          <p className="text-sm text-muted-foreground">{suggestion.detail}</p>
          {suggestion.exampleExercises.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">{t("Zum Beispiel:")} </span>
              <span className="font-medium">{suggestion.exampleExercises.join(" · ")}</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
