-- CreateEnum
CREATE TYPE "MeetupActivity" AS ENUM ('CLIMBING', 'GYM', 'OTHER');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "MeetupReminderLeadTime" AS ENUM ('NEVER', 'ONE_HOUR_BEFORE', 'MORNING_OF', 'EVENING_BEFORE');

ALTER TYPE "ClimbingFocus" ADD VALUE 'PUSH';
ALTER TYPE "ClimbingFocus" ADD VALUE 'PULL';
ALTER TYPE "ClimbingFocus" ADD VALUE 'LEGS';
ALTER TYPE "ClimbingFocus" ADD VALUE 'CORE';
ALTER TYPE "ClimbingFocus" ADD VALUE 'GRIP';

-- DropIndex
DROP INDEX "ClimbingMeetup_groupId_dateKey_key";

-- AlterTable
ALTER TABLE "ClimbingMeetup" ADD COLUMN     "activity" "MeetupActivity" NOT NULL DEFAULT 'CLIMBING',
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "ClimbingMeetupParticipant" ADD COLUMN     "remindedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "meetupReminderLeadTime" "MeetupReminderLeadTime" NOT NULL DEFAULT 'EVENING_BEFORE';

-- CreateTable
CREATE TABLE "ClimbingMeetupSuggestion" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "suggestedById" TEXT NOT NULL,
    "dateKey" TEXT,
    "time" TEXT,
    "location" TEXT,
    "note" TEXT,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimbingMeetupSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredDateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClimbingMeetupSuggestion_meetupId_idx" ON "ClimbingMeetupSuggestion"("meetupId");

-- CreateIndex
CREATE INDEX "WorkoutReminder_userId_idx" ON "WorkoutReminder"("userId");

-- CreateIndex
CREATE INDEX "ClimbingMeetup_groupId_dateKey_idx" ON "ClimbingMeetup"("groupId", "dateKey");

-- AddForeignKey
ALTER TABLE "ClimbingMeetupSuggestion" ADD CONSTRAINT "ClimbingMeetupSuggestion_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "ClimbingMeetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingMeetupSuggestion" ADD CONSTRAINT "ClimbingMeetupSuggestion_suggestedById_fkey" FOREIGN KEY ("suggestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutReminder" ADD CONSTRAINT "WorkoutReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
