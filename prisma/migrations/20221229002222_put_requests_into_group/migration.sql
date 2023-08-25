/*
  Warnings:

  - You are about to drop the column `icon` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Request` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Request" DROP COLUMN "icon",
DROP COLUMN "title",
ADD COLUMN     "relatedGroupId" UUID;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_relatedGroupId_fkey" FOREIGN KEY ("relatedGroupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
