-- WARNING for anyone upgrading an instance that already has GroupGoal rows
-- (a fresh install has none, so this is a no-op warning for you): the
-- `DROP COLUMN "unit", ADD COLUMN "unit" "GoalUnit"` below discards
-- whatever free-text unit strings existed before ("Wdh", "km", ...) since
-- Postgres can't auto-cast arbitrary text to a new enum. Back up the old
-- values first (e.g. `SELECT id, unit FROM "GroupGoal"`) and re-map them
-- by hand afterward if you're upgrading a live instance instead of
-- starting fresh - see the project history around this migration's date
-- for the exact CASE-based USING clause used to preserve real data here.

-- CreateEnum
CREATE TYPE "GoalUnit" AS ENUM ('REPS', 'DURATION_SEC', 'KM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContributionSource" AS ENUM ('MANUAL', 'WORKOUT', 'CHALLENGE');

-- AlterTable
ALTER TABLE "GroupGoal" ADD COLUMN     "customUnitLabel" TEXT,
ADD COLUMN     "exerciseId" TEXT,
DROP COLUMN "unit",
ADD COLUMN     "unit" "GoalUnit" NOT NULL;

-- AlterTable
ALTER TABLE "GroupGoalContribution" ADD COLUMN     "source" "ContributionSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE INDEX "GroupGoal_exerciseId_idx" ON "GroupGoal"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupGoalContribution_goalId_source_sourceId_key" ON "GroupGoalContribution"("goalId", "source", "sourceId");

-- AddForeignKey
ALTER TABLE "GroupGoal" ADD CONSTRAINT "GroupGoal_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

