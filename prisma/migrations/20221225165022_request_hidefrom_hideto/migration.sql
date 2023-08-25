-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "hideFrom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideTo" BOOLEAN NOT NULL DEFAULT false;
