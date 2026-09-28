-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QuestReminderCadence" AS ENUM ('AUTO', 'DAILY', 'EVERY_3_DAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'NEVER');

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDateKey" TEXT NOT NULL,
    "sharedWithGroups" BOOLEAN NOT NULL DEFAULT true,
    "reminderCadence" "QuestReminderCadence" NOT NULL DEFAULT 'AUTO',
    "status" "QuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "lastRemindedDateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestStep" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quest_userId_status_idx" ON "Quest"("userId", "status");

-- CreateIndex
CREATE INDEX "QuestStep_questId_position_idx" ON "QuestStep"("questId", "position");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestStep" ADD CONSTRAINT "QuestStep_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
