-- API key scopes (read-only vs. read-write) - docs/ANALYSIS.md SEC-A4 and
-- the follow-up decision to default new keys to read-only. Existing keys
-- get READ_WRITE so nothing that already depends on write access breaks;
-- new keys default to READ_ONLY at the application layer instead (see
-- POST /api/settings/api-keys), not via this column's default.
CREATE TYPE "ApiKeyScope" AS ENUM ('READ_ONLY', 'READ_WRITE');

ALTER TABLE "ApiKey" ADD COLUMN "scope" "ApiKeyScope" NOT NULL DEFAULT 'READ_WRITE';
