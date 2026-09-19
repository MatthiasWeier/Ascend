-- AlterTable
ALTER TABLE "DailyChallengeAttempt" ADD COLUMN     "manualReps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "workoutReps" INTEGER NOT NULL DEFAULT 0;

-- Existing attempts were all tapped in manually.
UPDATE "DailyChallengeAttempt" SET "manualReps" = "currentReps";
