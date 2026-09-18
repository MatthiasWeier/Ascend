import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Heartbeat } from "@/components/heartbeat";
import { WeightUnitProvider } from "@/components/weight-unit-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { avatarUrl: true, isAdmin: true, weightUnit: true },
  });

  return (
    <AppShell
      userName={session!.user.name!}
      avatarUrl={user?.avatarUrl ?? null}
      isAdmin={user?.isAdmin ?? false}
    >
      <WeightUnitProvider initialUnit={user?.weightUnit ?? "KG"}>
        <Heartbeat />
        {children}
      </WeightUnitProvider>
    </AppShell>
  );
}
