import { prisma } from "@/lib/prisma";

export async function getGroupMembership(userId: string, groupId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}
