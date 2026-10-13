BEGIN;

ALTER TABLE "company_users" DROP CONSTRAINT "company_users_role_id_fkey";

-- Point memberships at one shared role record for each existing role name.
UPDATE "company_users" AS membership
SET "role_id" = shared_role."id"
FROM "roles" AS existing_role
JOIN (
    SELECT "name", MIN("id") AS "id"
    FROM "roles"
    GROUP BY "name"
) AS shared_role ON shared_role."name" = existing_role."name"
WHERE membership."role_id" = existing_role."id";

DELETE FROM "roles" AS duplicate_role
USING "roles" AS retained_role
WHERE duplicate_role."name" = retained_role."name"
AND duplicate_role."id" > retained_role."id";

ALTER TABLE "roles" DROP CONSTRAINT "roles_company_id_fkey";
DROP INDEX "roles_company_id_name_key";
DROP INDEX "roles_company_id_id_key";
ALTER TABLE "roles" DROP COLUMN "company_id";

CREATE UNIQUE INDEX "roles_name_key" ON "roles" ("name");

ALTER TABLE "company_users"
ADD CONSTRAINT "company_users_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT;
