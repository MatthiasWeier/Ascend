"use client";

import { Suspense, useEffect, useState } from "react";
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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const inviteFromLink = searchParams.get("invite") ?? "";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(inviteFromLink);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/register")
      .then((r) => r.json())
      .then((data: { inviteOnly: boolean }) => setInviteOnly(data.inviteOnly));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, password, inviteCode: inviteCode || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "Username already registered"
          ? "Benutzername bereits vergeben."
          : (data.error ?? "Registrierung fehlgeschlagen.")
      );
      setLoading(false);
      return;
    }

    await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
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
            <CardTitle className="text-xl">Account erstellen</CardTitle>
            <CardDescription>
              {inviteFromLink
                ? "Du wurdest zu einer Gruppe eingeladen - nach dem Anlegen bist du direkt Mitglied."
                : "Push dich selbst. Push deine Crew."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {(inviteOnly || inviteFromLink) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="inviteCode">Einladungscode</Label>
                  <Input
                    id="inviteCode"
                    required={inviteOnly}
                    readOnly={!!inviteFromLink}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className={inviteFromLink ? "bg-secondary/50" : undefined}
                  />
                  {inviteOnly && !inviteFromLink && (
                    <p className="text-xs text-muted-foreground">
                      Diese Instanz ist nur mit Einladungslink zugänglich.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[a-zA-Z0-9_.\-]+"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Nur Buchstaben, Zahlen, _ . -</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? "Einen Moment…" : "Registrieren"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Schon einen Account?{" "}
          <Link
            href={`/login${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="font-medium text-primary hover:underline"
          >
            Anmelden
          </Link>
        </p>
      </div>

      <LegalFooter className="mt-2" />
    </main>
  );
}
