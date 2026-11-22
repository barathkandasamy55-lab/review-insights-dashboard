-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "hasComplaint" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasPraise" BOOLEAN NOT NULL DEFAULT false;
