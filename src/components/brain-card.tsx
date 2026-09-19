import { BedDouble, Hand, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BrainSuggestion } from "@/lib/workout-brain";

export function BrainCard({ suggestion }: { suggestion: BrainSuggestion }) {
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
        </div>
      </CardContent>
    </Card>
  );
}
