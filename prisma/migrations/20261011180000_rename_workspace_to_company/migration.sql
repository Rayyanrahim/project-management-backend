-- Rename tables
ALTER TABLE "workspaces" RENAME TO "companies";
ALTER TABLE "workspace_users" RENAME TO "company_users";

-- Rename FK column
ALTER TABLE "company_users" RENAME COLUMN "workspace_id" TO "company_id";

-- Rename primary keys / indexes
ALTER INDEX IF EXISTS "workspaces_pkey" RENAME TO "companies_pkey";
ALTER INDEX IF EXISTS "workspaces_slug_key" RENAME TO "companies_slug_key";
ALTER INDEX IF EXISTS "workspace_users_pkey" RENAME TO "company_users_pkey";
ALTER INDEX IF EXISTS "workspace_users_workspace_id_user_id_key" RENAME TO "company_users_company_id_user_id_key";

-- Rename foreign keys
ALTER TABLE "companies" RENAME CONSTRAINT "workspaces_owner_id_fkey" TO "companies_owner_id_fkey";
ALTER TABLE "company_users" RENAME CONSTRAINT "workspace_users_workspace_id_fkey" TO "company_users_company_id_fkey";
ALTER TABLE "company_users" RENAME CONSTRAINT "workspace_users_user_id_fkey" TO "company_users_user_id_fkey";
