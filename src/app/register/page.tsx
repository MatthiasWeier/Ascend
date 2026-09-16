"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "Email already registered" ? "E-Mail bereits registriert." : "Registrierung fehlgeschlagen.");
      setLoading(false);
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Account erstellen</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <input
          type="email"
          placeholder="E-Mail"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <input
          type="password"
          placeholder="Passwort (min. 8 Zeichen)"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "..." : "Registrieren"}
        </button>
      </form>
      <p className="text-sm text-gray-500">
        Schon einen Account?{" "}
        <Link href="/login" className="underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}
