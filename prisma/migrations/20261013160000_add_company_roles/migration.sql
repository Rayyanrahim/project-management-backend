BEGIN;

CREATE TABLE "roles" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_company_id_name_key" ON "roles" ("company_id", "name");
CREATE UNIQUE INDEX "roles_company_id_id_key" ON "roles" ("company_id", "id");

ALTER TABLE "roles"
ADD CONSTRAINT "roles_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "roles" ("company_id", "name")
SELECT company."id", defaults."name"
FROM "companies" AS company
CROSS JOIN (VALUES ('OWNER'), ('ADMIN'), ('MEMBER'), ('GUEST')) AS defaults("name");

-- Preserve every existing membership role, including any custom values.
INSERT INTO "roles" ("company_id", "name")
SELECT DISTINCT "company_id", "role" FROM "company_users"
ON CONFLICT ("company_id", "name") DO NOTHING;

ALTER TABLE "company_users" ADD COLUMN "role_id" BIGINT;

UPDATE "company_users" AS membership
SET "role_id" = role_record."id"
FROM "roles" AS role_record
WHERE membership."company_id" = role_record."company_id"
AND membership."role" = role_record."name";

ALTER TABLE "company_users" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "company_users"
ADD CONSTRAINT "company_users_role_id_fkey"
FOREIGN KEY ("company_id", "role_id") REFERENCES "roles" ("company_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

CREATE INDEX "company_users_role_id_idx" ON "company_users" ("role_id");

ALTER TABLE "company_users" DROP COLUMN "role";

COMMIT;
