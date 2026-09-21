-- CreateEnum
CREATE TYPE "Muscle" AS ENUM ('CHEST', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'LATS', 'UPPER_BACK', 'LOWER_BACK', 'ABS', 'OBLIQUES', 'GLUTES', 'QUADS', 'HAMSTRINGS', 'CALVES');

-- CreateEnum
CREATE TYPE "MuscleRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateTable
CREATE TABLE "ExerciseMuscle" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "role" "MuscleRole" NOT NULL,

    CONSTRAINT "ExerciseMuscle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusclePreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "wish" INTEGER NOT NULL,

    CONSTRAINT "MusclePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExerciseMuscle_muscle_idx" ON "ExerciseMuscle"("muscle");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseMuscle_exerciseId_muscle_key" ON "ExerciseMuscle"("exerciseId", "muscle");

-- CreateIndex
CREATE UNIQUE INDEX "MusclePreference_userId_muscle_key" ON "MusclePreference"("userId", "muscle");

-- AddForeignKey
ALTER TABLE "ExerciseMuscle" ADD CONSTRAINT "ExerciseMuscle_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusclePreference" ADD CONSTRAINT "MusclePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

