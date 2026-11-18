-- TOTP replay protection (docs/ANALYSIS.md, SEC-A3): the same 6-digit
-- code could be submitted multiple times within its ~90s valid window.
-- Nullable/additive - null means "no replay history yet", not insecure.
ALTER TABLE "User" ADD COLUMN "totpLastUsedCounter" INTEGER;
