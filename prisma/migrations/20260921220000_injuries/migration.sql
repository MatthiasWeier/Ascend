-- CreateEnum
CREATE TYPE "BodyPart" AS ENUM ('NECK', 'SHOULDER', 'ELBOW', 'FOREARM', 'WRIST', 'FINGERS', 'CHEST', 'UPPER_BACK', 'LOWER_BACK', 'HIP', 'KNEE', 'ANKLE');

-- CreateEnum
CREATE TYPE "InjurySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateTable
CREATE TABLE "Injury" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bodyPart" "BodyPart" NOT NULL,
    "severity" "InjurySeverity" NOT NULL,
    "note" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Injury_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Injury_userId_resolvedAt_idx" ON "Injury"("userId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "Injury" ADD CONSTRAINT "Injury_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

