/*
  Warnings:

  - You are about to drop the column `topics` on the `Group` table. All the data in the column will be lost.
  - Added the required column `topic` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('INCOMPLETE', 'REVIEWING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "topics",
ADD COLUMN     "topic" "Topic" NOT NULL;

-- AlterTable
ALTER TABLE "TrainingSurvey" ADD COLUMN     "status" "SurveyStatus" NOT NULL DEFAULT 'INCOMPLETE';
