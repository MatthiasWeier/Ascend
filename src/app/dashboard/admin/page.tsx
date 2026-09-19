import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUserTable } from "@/components/admin-user-table";
import { getT } from "@/lib/i18n/server";

export default async function AdminPage() {
  const { t } = await getT();
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!me?.isAdmin) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">{t("Nutzerverwaltung für diese Instanz.")}</p>
      </div>
      <AdminUserTable currentUserId={session.user.id} />
    </div>
  );
}
