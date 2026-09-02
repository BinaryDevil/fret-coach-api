CREATE TYPE "ScoreImportStatus" AS ENUM ('UPLOAD_PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "UserSong" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "artist" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSong_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreImport" (
  "id" TEXT NOT NULL,
  "userSongId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "ScoreImportStatus" NOT NULL DEFAULT 'UPLOAD_PENDING',
  "format" "ScoreFormat" NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "sourceHash" TEXT,
  "eventVersion" INTEGER NOT NULL DEFAULT 0,
  "timeline" JSONB,
  "parseError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScoreImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScoreImportTrack" (
  "id" TEXT NOT NULL,
  "scoreImportId" TEXT NOT NULL,
  "sourceTrackId" TEXT NOT NULL,
  "trackIndex" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "instrument" TEXT NOT NULL,
  "tuning" INTEGER[] NOT NULL,
  "capo" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScoreImportTrack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSong_userId_updatedAt_idx" ON "UserSong"("userId", "updatedAt");
CREATE UNIQUE INDEX "ScoreImport_storageKey_key" ON "ScoreImport"("storageKey");
CREATE INDEX "ScoreImport_userId_createdAt_idx" ON "ScoreImport"("userId", "createdAt");
CREATE INDEX "ScoreImport_userSongId_createdAt_idx" ON "ScoreImport"("userSongId", "createdAt");
CREATE UNIQUE INDEX "ScoreImportTrack_scoreImportId_sourceTrackId_key" ON "ScoreImportTrack"("scoreImportId", "sourceTrackId");
CREATE INDEX "ScoreImportTrack_scoreImportId_trackIndex_idx" ON "ScoreImportTrack"("scoreImportId", "trackIndex");

ALTER TABLE "UserSong" ADD CONSTRAINT "UserSong_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreImport" ADD CONSTRAINT "ScoreImport_userSongId_fkey"
  FOREIGN KEY ("userSongId") REFERENCES "UserSong"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreImport" ADD CONSTRAINT "ScoreImport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScoreImportTrack" ADD CONSTRAINT "ScoreImportTrack_scoreImportId_fkey"
  FOREIGN KEY ("scoreImportId") REFERENCES "ScoreImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
