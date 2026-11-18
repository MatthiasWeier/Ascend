import Link from "next/link";
import { redirect } from "next/navigation";
import { Mountain, Flame, Users, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import { LanguageToggle } from "@/components/language-toggle";
import { getT } from "@/lib/i18n/server";

export default async function Home() {
  const session = await auth();
  const { t } = await getT();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <LanguageToggle className="absolute right-4 top-4" />
      <div className="flex items-center gap-2">
        <Mountain className="size-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">Ascend</span>
      </div>

      <div className="flex max-w-lg flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Train together. <span className="text-primary">Push each other.</span>
        </h1>
        <p className="text-balance text-muted-foreground">
          {t("Track your training, let the Workout Brain tell you what's next, and motivate your crew in shared challenges.")}
        </p>
      </div>

      <div className="flex gap-3">
        <Button size="lg" render={<Link href="/register" />}>
          {t("Get started")}
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/login" />}>
          {t("Log in")}
        </Button>
      </div>

      <div className="mt-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <Flame className="size-5 text-primary" />
          <p className="text-sm font-medium">Workout Brain</p>
          <p className="text-xs text-muted-foreground">
            {t("Recommends muscle focus, rest days and skin recovery")}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <TrendingUp className="size-5 text-primary" />
          <p className="text-sm font-medium">Analytics</p>
          <p className="text-xs text-muted-foreground">
            {t("1RM history, volume, balance radar, climbing pyramid")}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5">
          <Users className="size-5 text-primary" />
          <p className="text-sm font-medium">{t("Groups")}</p>
          <p className="text-xs text-muted-foreground">
            {t("Share challenges, photos & workouts with your crew")}
          </p>
        </div>
      </div>

      <LegalFooter className="mt-4" />
    </main>
  );
}
