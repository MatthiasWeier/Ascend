-- CreateTable
CREATE TABLE "InjuryCheckin" (
    "id" TEXT NOT NULL,
    "injuryId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "painLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InjuryCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InjuryCheckin_injuryId_dateKey_key" ON "InjuryCheckin"("injuryId", "dateKey");

-- AddForeignKey
ALTER TABLE "InjuryCheckin" ADD CONSTRAINT "InjuryCheckin_injuryId_fkey" FOREIGN KEY ("injuryId") REFERENCES "Injury"("id") ON DELETE CASCADE ON UPDATE CASCADE;
