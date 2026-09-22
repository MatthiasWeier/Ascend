-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "rateLimitingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the single settings row so application code can always assume it
-- exists (no first-request "create if missing" branch needed). Defaults
-- here match the current, pre-toggle behavior of this instance: no rate
-- limiting active, open registration (INVITE_ONLY was unset).
INSERT INTO "AppSettings" ("id", "rateLimitingEnabled", "registrationOpen", "updatedAt")
VALUES ('global', false, true, CURRENT_TIMESTAMP);
