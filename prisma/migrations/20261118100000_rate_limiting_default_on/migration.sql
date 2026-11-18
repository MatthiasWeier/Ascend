-- Rate limiting (login lockout, registration brute-force protection) was
-- opt-in since AppSettings was introduced, defaulting to off so a fresh
-- self-hosted instance behaved exactly like it did before the switch
-- existed. The security review (docs/ANALYSIS.md, SEC-A-RL0) flagged that
-- as the wrong default: a fresh instance has zero brute-force protection
-- until an admin finds and flips the switch. Flips the default for new
-- installs AND the already-seeded row on existing ones - still toggleable
-- off per-instance in Admin > Instanz-Einstellungen.
ALTER TABLE "AppSettings" ALTER COLUMN "rateLimitingEnabled" SET DEFAULT true;

UPDATE "AppSettings" SET "rateLimitingEnabled" = true WHERE id = 'global';
