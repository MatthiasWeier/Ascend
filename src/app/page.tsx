import Link from "next/link";
import { redirect } from "next/navigation";
import { Mountain, Flame, Users, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex items-center gap-2">
        <Mountain className="size-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">Ascend</span>
      </div>

      <div className="flex max-w-lg flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Train together. <span className="text-primary">Push each other.</span>
        </h1>
        <p className="text-balance text-muted-foreground">
          Tracke dein Training, lass dir vom Workout Brain sagen was als
          Nächstes dran ist, und motiviere deine Crew in gemeinsamen
          Challenges.
        </p>
      </div>

      <div className="flex gap-3">
        <Button size="lg" render={<Link href="/register" />}>
          Loslegen
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/login" />}>
          Anmelden
        </Button>
      </div>

      <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <Flame className="size-5 text-primary" />
          <p className="text-sm font-medium">Workout Brain</p>
          <p className="text-xs text-muted-foreground">
            Empfiehlt Muskel-Fokus, Ruhetage und Haut-Regeneration
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <TrendingUp className="size-5 text-primary" />
          <p className="text-sm font-medium">Analytics</p>
          <p className="text-xs text-muted-foreground">
            1RM-Verlauf, Volumen, Balance-Radar, Kletter-Pyramide
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <Users className="size-5 text-primary" />
          <p className="text-sm font-medium">Gruppen</p>
          <p className="text-xs text-muted-foreground">
            Challenges, Fotos & Workouts mit deiner Crew teilen
          </p>
        </div>
      </div>

      <LegalFooter className="mt-4" />
    </main>
  );
}
