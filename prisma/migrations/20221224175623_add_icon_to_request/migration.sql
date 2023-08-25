/*
  Warnings:

  - Added the required column `icon` to the `Request` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "icon" TEXT NOT NULL;
