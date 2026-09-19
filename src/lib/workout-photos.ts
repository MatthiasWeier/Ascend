import { prisma } from "@/lib/prisma";
import { storageDeleteFile } from "@/lib/storage";

export const MAX_PHOTOS_PER_WORKOUT = 10;

export function photoPath(userId: string, filename: string) {
  return `workout-photos/${userId}/${filename}`;
}

export async function deletePhotoFiles(photos: { userId: string; filename: string }[]) {
  await Promise.all(photos.map((p) => storageDeleteFile(photoPath(p.userId, p.filename)).catch(() => {})));
}

// Attaches the given (still unattached, own) photos to a workout, capped so
// a workout can't collect unlimited files. Ignores ids that aren't the
// caller's or are already attached elsewhere.
export async function attachPhotos(userId: string, sessionId: string, photoIds?: string[]) {
  if (!photoIds || photoIds.length === 0) return;
  const already = await prisma.workoutPhoto.count({ where: { sessionId } });
  const room = Math.max(0, MAX_PHOTOS_PER_WORKOUT - already);
  await prisma.workoutPhoto.updateMany({
    where: { id: { in: photoIds.slice(0, room) }, userId, sessionId: null },
    data: { sessionId },
  });
}
