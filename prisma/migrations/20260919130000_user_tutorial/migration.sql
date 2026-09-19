-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tutorialCompletedAt" TIMESTAMP(3);

-- Existing accounts already know the app - only new sign-ups see the tutorial.
UPDATE "User" SET "tutorialCompletedAt" = now();
