"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LegalFooter } from "@/components/legal-footer";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // First submit with just username+password: check whether this
    // account has 2FA on before attempting sign-in, so we can show the
    // code field instead of failing once, generically, then asking again.
    if (!needsTotp) {
      setLoading(true);
      const check = await fetch("/api/auth/totp-required", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
        .then((r) => r.json())
        .catch(() => ({ required: false }));
      setLoading(false);
      if (check.required) {
        setNeedsTotp(true);
        return;
      }
    }

    setLoading(true);
    const result = await signIn("credentials", {
      username,
      password,
      totpToken: needsTotp ? totpToken : undefined,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError(
        needsTotp
          ? "Benutzername, Passwort oder Code ist falsch."
          : "Benutzername oder Passwort ist falsch."
      );
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex animate-in items-center gap-2 fade-in duration-500">
        <Mountain className="size-7 text-primary" />
        <span className="text-xl font-bold tracking-tight">Ascend</span>
      </div>

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Willkommen zurück</CardTitle>
            <CardDescription>Melde dich an, um weiterzutrainieren.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  required
                  autoComplete="username"
                  disabled={needsTotp}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={needsTotp}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {needsTotp && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="totp">2FA-Code</Label>
                  <Input
                    id="totp"
                    required
                    autoFocus
                    inputMode="numeric"
                    placeholder="123456 oder Backup-Code"
                    autoComplete="one-time-code"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value)}
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? "Einen Moment…" : needsTotp ? "Bestätigen" : "Anmelden"}
              </Button>
              {needsTotp && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => {
                    setNeedsTotp(false);
                    setTotpToken("");
                    setError(null);
                  }}
                >
                  Zurück
                </button>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Noch kein Account?{" "}
          <Link
            href={`/register${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            Registrieren
          </Link>
        </p>
      </div>

      <LegalFooter className="mt-2" />
    </main>
  );
}
