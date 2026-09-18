-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('WARMUP', 'NORMAL', 'DROP', 'FAILURE');

-- AlterTable
ALTER TABLE "WorkoutSet" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "setType" "SetType" NOT NULL DEFAULT 'NORMAL';

