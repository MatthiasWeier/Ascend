-- CreateEnum
CREATE TYPE "ClimbingFocus" AS ENUM ('SLAB', 'POWER', 'TECHNIK', 'AUSDAUER', 'KRAFT', 'MENTAL');

-- CreateTable
CREATE TABLE "ClimbingMeetup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "time" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimbingMeetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimbingMeetupParticipant" (
    "id" TEXT NOT NULL,
    "meetupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT,
    "focuses" "ClimbingFocus"[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClimbingMeetupParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClimbingMeetup_dateKey_idx" ON "ClimbingMeetup"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClimbingMeetup_groupId_dateKey_key" ON "ClimbingMeetup"("groupId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClimbingMeetupParticipant_meetupId_userId_key" ON "ClimbingMeetupParticipant"("meetupId", "userId");

-- AddForeignKey
ALTER TABLE "ClimbingMeetup" ADD CONSTRAINT "ClimbingMeetup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingMeetup" ADD CONSTRAINT "ClimbingMeetup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingMeetupParticipant" ADD CONSTRAINT "ClimbingMeetupParticipant_meetupId_fkey" FOREIGN KEY ("meetupId") REFERENCES "ClimbingMeetup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingMeetupParticipant" ADD CONSTRAINT "ClimbingMeetupParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
