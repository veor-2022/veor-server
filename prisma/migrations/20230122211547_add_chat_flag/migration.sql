-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "language" "Language"[] DEFAULT ARRAY['ENGLISH']::"Language"[],
ADD COLUMN     "sessionEnded" BOOLEAN NOT NULL DEFAULT false;
