ALTER TABLE "workspaces" ADD COLUMN "description" TEXT;

CREATE UNIQUE INDEX "workspaces_company_id_name_ci_key"
ON "workspaces" ("company_id", LOWER("name"));
