-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'CLIMBING';

-- AlterTable
ALTER TABLE "GroupPost" ADD COLUMN     "climbingDate" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GroupPost_groupId_userId_climbingDate_key" ON "GroupPost"("groupId", "userId", "climbingDate");
