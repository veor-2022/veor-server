/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `settingsFeedback` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "updatedAt",
ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "settingsFeedback";
