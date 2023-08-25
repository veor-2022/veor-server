/*
  Warnings:

  - The values [ADMIN] on the enum `GroupMemberStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GroupMemberStatus_new" AS ENUM ('FACILITATOR', 'CO_FACILITATOR', 'USER');
ALTER TABLE "GroupEnrollment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "GroupEnrollment" ALTER COLUMN "status" TYPE "GroupMemberStatus_new" USING ("status"::text::"GroupMemberStatus_new");
ALTER TYPE "GroupMemberStatus" RENAME TO "GroupMemberStatus_old";
ALTER TYPE "GroupMemberStatus_new" RENAME TO "GroupMemberStatus";
DROP TYPE "GroupMemberStatus_old";
ALTER TABLE "GroupEnrollment" ALTER COLUMN "status" SET DEFAULT 'USER';
COMMIT;
