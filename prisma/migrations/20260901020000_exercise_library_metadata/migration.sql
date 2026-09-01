ALTER TABLE "Exercise"
  ADD COLUMN "skillFocus" TEXT NOT NULL DEFAULT 'Technique fundamentals',
  ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "libraryOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Exercise_isPublished_libraryOrder_idx" ON "Exercise"("isPublished", "libraryOrder");
