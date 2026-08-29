/*
  Warnings:

  - You are about to drop the column `remember_me` on the `auth_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "auth_sessions" DROP COLUMN "remember_me";
