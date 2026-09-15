ALTER TABLE "PracticeAttempt"
  ALTER COLUMN "exerciseId" DROP NOT NULL,
  ADD COLUMN "scoreImportId" TEXT,
  ADD COLUMN "trackId" TEXT,
  ADD COLUMN "passageStartMeasure" INTEGER,
  ADD COLUMN "passageEndMeasure" INTEGER;

ALTER TABLE "PracticeAttempt"
  ADD CONSTRAINT "PracticeAttempt_scoreImportId_fkey"
  FOREIGN KEY ("scoreImportId") REFERENCES "ScoreImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAttempt"
  ADD CONSTRAINT "PracticeAttempt_target_check" CHECK (
    (
      "exerciseId" IS NOT NULL
      AND "scoreImportId" IS NULL
      AND "trackId" IS NULL
      AND "passageStartMeasure" IS NULL
      AND "passageEndMeasure" IS NULL
    )
    OR
    (
      "exerciseId" IS NULL
      AND "scoreImportId" IS NOT NULL
      AND "loopRegionId" IS NULL
      AND "trackId" IS NOT NULL
      AND "passageStartMeasure" IS NOT NULL
      AND "passageEndMeasure" IS NOT NULL
      AND "passageStartMeasure" <= "passageEndMeasure"
    )
  );

CREATE INDEX "PracticeAttempt_userId_scoreImportId_completedAt_idx"
  ON "PracticeAttempt"("userId", "scoreImportId", "completedAt");
