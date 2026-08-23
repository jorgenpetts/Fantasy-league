-- AlterTable
ALTER TABLE "CricketPlayer" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "FantasyLineup" ADD COLUMN     "freeTransfers" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "grossPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transfersMade" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PlayerPerformance" ADD COLUMN     "didBat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "droppedCatches" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LineupTransferSummary" (
    "id" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "playersOut" TEXT[],
    "playersIn" TEXT[],
    "transfersMade" INTEGER NOT NULL DEFAULT 0,
    "freeTransfers" INTEGER NOT NULL DEFAULT 3,
    "transferPenalty" INTEGER NOT NULL DEFAULT 0,
    "wildcardActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineupTransferSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineupTransferSummary_lineupId_key" ON "LineupTransferSummary"("lineupId");

-- CreateIndex
CREATE INDEX "LineupTransferSummary_roundId_idx" ON "LineupTransferSummary"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "LineupTransferSummary_fantasyTeamId_roundId_key" ON "LineupTransferSummary"("fantasyTeamId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "ChipUsage_fantasyTeamId_roundId_key" ON "ChipUsage"("fantasyTeamId", "roundId");

-- AddForeignKey
ALTER TABLE "LineupTransferSummary" ADD CONSTRAINT "LineupTransferSummary_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupTransferSummary" ADD CONSTRAINT "LineupTransferSummary_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupTransferSummary" ADD CONSTRAINT "LineupTransferSummary_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "FantasyLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

