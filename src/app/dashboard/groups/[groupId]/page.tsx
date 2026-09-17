import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getGroupMembership } from "@/lib/group-auth";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  const membership = await getGroupMembership(session!.user.id, groupId);

  if (!membership) {
    redirect("/dashboard/groups");
  }

  return <GroupDetail groupId={groupId} />;
}
