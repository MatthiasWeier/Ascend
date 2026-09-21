import { prisma } from "@/lib/prisma";

// Custom exercises can be changed/removed by whoever created them, or by the
// leader of the group a group exercise belongs to. Default exercises never.
export async function findManageableExercise(exerciseId: string, userId: string) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { muscles: { select: { muscle: true, role: true } } },
  });
  if (!exercise || exercise.isDefault) return null;
  if (exercise.createdById === userId) return exercise;
  if (exercise.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: exercise.groupId, userId } },
      select: { role: true },
    });
    if (membership?.role === "LEADER") return exercise;
  }
  return null;
}
