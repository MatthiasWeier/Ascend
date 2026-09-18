-- CreateTable
CREATE TABLE "WorkoutFocusFatigue" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "focus" "MuscleFocus" NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "WorkoutFocusFatigue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutFocusFatigue_sessionId_idx" ON "WorkoutFocusFatigue"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutFocusFatigue_sessionId_focus_key" ON "WorkoutFocusFatigue"("sessionId", "focus");

-- AddForeignKey
ALTER TABLE "WorkoutFocusFatigue" ADD CONSTRAINT "WorkoutFocusFatigue_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

