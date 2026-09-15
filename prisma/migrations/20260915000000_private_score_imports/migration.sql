DROP INDEX "ScoreImport_isPublic_status_createdAt_idx";

ALTER TABLE "ScoreImport"
  DROP COLUMN "isPublic",
  DROP COLUMN "publishedAt";
