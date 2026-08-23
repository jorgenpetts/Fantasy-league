/*
  Warnings:

  - You are about to drop the column `oversBowled` on the `PlayerPerformance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PlayerPerformance" DROP COLUMN "oversBowled",
ADD COLUMN     "ballsBowled" INTEGER NOT NULL DEFAULT 0;
