-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('WICKET_KEEPER', 'BATTER', 'ALL_ROUNDER', 'BOWLER');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('UPCOMING', 'LOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChipType" AS ENUM ('WILDCARD', 'TRIPLE_CAPTAIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CricketPlayer" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CricketPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPerformance" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "oversBowled" DECIMAL(4,1) NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "runOuts" INTEGER NOT NULL DEFAULT 0,
    "fantasyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyTeam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantasyTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyLineup" (
    "id" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "roundPoints" INTEGER NOT NULL DEFAULT 0,
    "transferPenalty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FantasyLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyLineupPlayer" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "FantasyLineupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipUsage" (
    "id" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "chipType" "ChipType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Season_active_idx" ON "Season"("active");

-- CreateIndex
CREATE INDEX "Round_seasonId_idx" ON "Round"("seasonId");

-- CreateIndex
CREATE INDEX "Round_deadline_idx" ON "Round"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Round_seasonId_roundNumber_key" ON "Round"("seasonId", "roundNumber");

-- CreateIndex
CREATE INDEX "CricketPlayer_active_idx" ON "CricketPlayer"("active");

-- CreateIndex
CREATE INDEX "CricketPlayer_position_idx" ON "CricketPlayer"("position");

-- CreateIndex
CREATE INDEX "PlayerPerformance_roundId_idx" ON "PlayerPerformance"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPerformance_playerId_roundId_key" ON "PlayerPerformance"("playerId", "roundId");

-- CreateIndex
CREATE INDEX "FantasyTeam_seasonId_idx" ON "FantasyTeam"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_userId_seasonId_key" ON "FantasyTeam"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "FantasyLineup_roundId_idx" ON "FantasyLineup"("roundId");

-- CreateIndex
CREATE INDEX "FantasyLineup_captainId_idx" ON "FantasyLineup"("captainId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyLineup_fantasyTeamId_roundId_key" ON "FantasyLineup"("fantasyTeamId", "roundId");

-- CreateIndex
CREATE INDEX "FantasyLineupPlayer_playerId_idx" ON "FantasyLineupPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyLineupPlayer_lineupId_playerId_key" ON "FantasyLineupPlayer"("lineupId", "playerId");

-- CreateIndex
CREATE INDEX "ChipUsage_roundId_idx" ON "ChipUsage"("roundId");

-- CreateIndex
CREATE INDEX "ChipUsage_fantasyTeamId_chipType_idx" ON "ChipUsage"("fantasyTeamId", "chipType");

-- CreateIndex
CREATE UNIQUE INDEX "ChipUsage_fantasyTeamId_roundId_chipType_key" ON "ChipUsage"("fantasyTeamId", "roundId", "chipType");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "CricketPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPerformance" ADD CONSTRAINT "PlayerPerformance_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyLineup" ADD CONSTRAINT "FantasyLineup_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyLineup" ADD CONSTRAINT "FantasyLineup_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyLineup" ADD CONSTRAINT "FantasyLineup_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "CricketPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyLineupPlayer" ADD CONSTRAINT "FantasyLineupPlayer_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "FantasyLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyLineupPlayer" ADD CONSTRAINT "FantasyLineupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "CricketPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipUsage" ADD CONSTRAINT "ChipUsage_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipUsage" ADD CONSTRAINT "ChipUsage_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
