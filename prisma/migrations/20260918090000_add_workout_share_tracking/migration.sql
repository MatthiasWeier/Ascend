-- AlterTable
ALTER TABLE "GroupPost" ADD COLUMN     "workoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GroupPost_groupId_workoutSessionId_key" ON "GroupPost"("groupId", "workoutSessionId");

-- AddForeignKey
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

