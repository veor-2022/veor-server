/*
  Warnings:

  - You are about to drop the `TrainingSurvey` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('INCOMPLETE', 'REVIEWING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('LISTENER', 'FACILITATOR');

-- DropForeignKey
ALTER TABLE "TrainingSurvey" DROP CONSTRAINT "TrainingSurvey_userId_fkey";

-- DropTable
DROP TABLE "TrainingSurvey";

-- DropEnum
DROP TYPE "SurveyStatus";

-- CreateTable
CREATE TABLE "Program" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "answers" TEXT[],
    "status" "ProgramStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "type" "ProgramType" NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
