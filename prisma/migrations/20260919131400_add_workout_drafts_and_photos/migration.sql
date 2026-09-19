-- CreateTable
CREATE TABLE "WorkoutDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutDraft_userId_key" ON "WorkoutDraft"("userId");

-- CreateIndex
CREATE INDEX "WorkoutPhoto_sessionId_idx" ON "WorkoutPhoto"("sessionId");

-- CreateIndex
CREATE INDEX "WorkoutPhoto_userId_sessionId_idx" ON "WorkoutPhoto"("userId", "sessionId");

-- AddForeignKey
ALTER TABLE "WorkoutDraft" ADD CONSTRAINT "WorkoutDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPhoto" ADD CONSTRAINT "WorkoutPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutPhoto" ADD CONSTRAINT "WorkoutPhoto_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

