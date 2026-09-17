-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('REPS', 'HOLD');

-- CreateEnum
CREATE TYPE "MuscleFocus" AS ENUM ('PUSH', 'PULL', 'LEGS', 'CORE', 'GRIP');

-- CreateEnum
CREATE TYPE "ClimbingStyle" AS ENUM ('BOULDER', 'ROUTE');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PHOTO', 'WORKOUT_SHARE', 'TEXT');

-- CreateEnum
CREATE TYPE "ChallengeAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ENDED_EARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyWeightKg" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ExerciseType" NOT NULL,
    "focus" "MuscleFocus" NOT NULL,
    "isBodyweight" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "groupId" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "perceivedExertion" INTEGER,
    "skinCondition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "durationSec" INTEGER,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplateEntry" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetReps" INTEGER,

    CONSTRAINT "WorkoutTemplateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyWeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyWeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimbingSend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "style" "ClimbingStyle" NOT NULL,
    "grade" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClimbingSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focus" "MuscleFocus" NOT NULL,
    "targetPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BalanceGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPost" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "content" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "exerciseId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChallengeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupDailyChallenge" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "challengeTemplateId" TEXT NOT NULL,
    "activatedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupDailyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChallengeGoal" (
    "id" TEXT NOT NULL,
    "groupDailyChallengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "isInvalidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChallengeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YammerVote" (
    "id" TEXT NOT NULL,
    "userChallengeGoalId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YammerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userChallengeGoalId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "targetRepsSnapshot" INTEGER NOT NULL,
    "currentReps" INTEGER NOT NULL DEFAULT 0,
    "status" "ChallengeAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "difficultyRating" INTEGER,

    CONSTRAINT "DailyChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "Exercise_groupId_idx" ON "Exercise"("groupId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_date_idx" ON "WorkoutSession"("userId", "date");

-- CreateIndex
CREATE INDEX "WorkoutSet_sessionId_idx" ON "WorkoutSet"("sessionId");

-- CreateIndex
CREATE INDEX "WorkoutSet_exerciseId_idx" ON "WorkoutSet"("exerciseId");

-- CreateIndex
CREATE INDEX "BodyWeightEntry_userId_dateKey_idx" ON "BodyWeightEntry"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "BodyWeightEntry_userId_dateKey_key" ON "BodyWeightEntry"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "ClimbingSend_userId_date_idx" ON "ClimbingSend"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BalanceGoal_userId_focus_key" ON "BalanceGoal"("userId", "focus");

-- CreateIndex
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_createdAt_idx" ON "GroupPost"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeTemplate_name_key" ON "ChallengeTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeTemplate_exerciseId_key" ON "ChallengeTemplate"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupDailyChallenge_groupId_challengeTemplateId_key" ON "GroupDailyChallenge"("groupId", "challengeTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "UserChallengeGoal_groupDailyChallengeId_userId_key" ON "UserChallengeGoal"("groupDailyChallengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "YammerVote_userChallengeGoalId_voterId_key" ON "YammerVote"("userChallengeGoalId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeAttempt_userChallengeGoalId_dateKey_key" ON "DailyChallengeAttempt"("userChallengeGoalId", "dateKey");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateEntry" ADD CONSTRAINT "WorkoutTemplateEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplateEntry" ADD CONSTRAINT "WorkoutTemplateEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyWeightEntry" ADD CONSTRAINT "BodyWeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingSend" ADD CONSTRAINT "ClimbingSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceGoal" ADD CONSTRAINT "BalanceGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeTemplate" ADD CONSTRAINT "ChallengeTemplate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDailyChallenge" ADD CONSTRAINT "GroupDailyChallenge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDailyChallenge" ADD CONSTRAINT "GroupDailyChallenge_challengeTemplateId_fkey" FOREIGN KEY ("challengeTemplateId") REFERENCES "ChallengeTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupDailyChallenge" ADD CONSTRAINT "GroupDailyChallenge_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallengeGoal" ADD CONSTRAINT "UserChallengeGoal_groupDailyChallengeId_fkey" FOREIGN KEY ("groupDailyChallengeId") REFERENCES "GroupDailyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallengeGoal" ADD CONSTRAINT "UserChallengeGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YammerVote" ADD CONSTRAINT "YammerVote_userChallengeGoalId_fkey" FOREIGN KEY ("userChallengeGoalId") REFERENCES "UserChallengeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YammerVote" ADD CONSTRAINT "YammerVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChallengeAttempt" ADD CONSTRAINT "DailyChallengeAttempt_userChallengeGoalId_fkey" FOREIGN KEY ("userChallengeGoalId") REFERENCES "UserChallengeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
