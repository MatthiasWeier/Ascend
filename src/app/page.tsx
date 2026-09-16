import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold">Ascend</h1>
      <p className="text-gray-500">
        Trainiere. Tracke deine Fortschritte. Push dich und deine Crew.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          Anmelden
        </Link>
        <Link href="/register" className="rounded border border-gray-300 px-4 py-2 dark:border-gray-700">
          Registrieren
        </Link>
      </div>
    </main>
  );
}
