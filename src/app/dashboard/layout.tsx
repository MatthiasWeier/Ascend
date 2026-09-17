import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return <AppShell userName={session!.user.name!}>{children}</AppShell>;
}
