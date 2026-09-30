-- CreateTable (implicit m:n join table for GroupGoal <-> Exercise)
CREATE TABLE "_GroupGoalExercises" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Carry over every existing single exerciseId link before dropping it.
INSERT INTO "_GroupGoalExercises" ("A", "B")
SELECT "exerciseId", "id" FROM "GroupGoal" WHERE "exerciseId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "_GroupGoalExercises_AB_unique" ON "_GroupGoalExercises"("A", "B");

-- CreateIndex
CREATE INDEX "_GroupGoalExercises_B_index" ON "_GroupGoalExercises"("B");

-- AddForeignKey
ALTER TABLE "_GroupGoalExercises" ADD CONSTRAINT "_GroupGoalExercises_A_fkey" FOREIGN KEY ("A") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupGoalExercises" ADD CONSTRAINT "_GroupGoalExercises_B_fkey" FOREIGN KEY ("B") REFERENCES "GroupGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "GroupGoal" DROP CONSTRAINT "GroupGoal_exerciseId_fkey";

-- DropIndex
DROP INDEX "GroupGoal_exerciseId_idx";

-- AlterTable
ALTER TABLE "GroupGoal" DROP COLUMN "exerciseId";
