/*
  Warnings:

  - You are about to drop the column `likes` on the `Chat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "likes";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0;
