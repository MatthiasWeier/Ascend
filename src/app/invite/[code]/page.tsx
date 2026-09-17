import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/invite/${code}`);
  }

  const group = await prisma.group.findUnique({ where: { inviteCode: code } });
  if (!group) {
    redirect("/dashboard/groups");
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    create: { groupId: group.id, userId: session.user.id, role: "MEMBER" },
    update: {},
  });

  redirect(`/dashboard/groups/${group.id}`);
}
