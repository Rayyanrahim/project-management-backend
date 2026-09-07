-- Deduplicate verifications: keep the latest row per user
DELETE FROM "verifications" v
USING "verifications" newer
WHERE v.user_id = newer.user_id
  AND v.id < newer.id;

DROP INDEX IF EXISTS "verifications_user_id_idx";

CREATE UNIQUE INDEX "verifications_user_id_key" ON "verifications"("user_id");
