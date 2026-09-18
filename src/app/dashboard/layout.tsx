import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { avatarUrl: true },
  });

  return (
    <AppShell userName={session!.user.name!} avatarUrl={user?.avatarUrl ?? null}>
      {children}
    </AppShell>
  );
}
