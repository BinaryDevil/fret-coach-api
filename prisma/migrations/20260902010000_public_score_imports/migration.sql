ALTER TABLE "ScoreImport"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "ScoreImport_isPublic_status_createdAt_idx"
  ON "ScoreImport"("isPublic", "status", "createdAt");
