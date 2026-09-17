-- AlterTable
ALTER TABLE "GroupDailyChallenge" ADD COLUMN     "stakes" TEXT;

-- CreateTable
CREATE TABLE "GroupGoal" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupGoalContribution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupGoalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupGoal_groupId_idx" ON "GroupGoal"("groupId");

-- CreateIndex
CREATE INDEX "GroupGoalContribution_goalId_idx" ON "GroupGoalContribution"("goalId");

-- CreateIndex
CREATE INDEX "GroupGoalContribution_userId_idx" ON "GroupGoalContribution"("userId");

-- AddForeignKey
ALTER TABLE "GroupGoal" ADD CONSTRAINT "GroupGoal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGoal" ADD CONSTRAINT "GroupGoal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGoalContribution" ADD CONSTRAINT "GroupGoalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "GroupGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupGoalContribution" ADD CONSTRAINT "GroupGoalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

