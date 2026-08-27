ALTER TABLE "ExerciseScore"
  ADD COLUMN "eventVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "eventSourceHash" TEXT,
  ADD COLUMN "timeline" JSONB,
  ADD COLUMN "eventGenerationError" TEXT,
  ADD COLUMN "eventGeneratedAt" TIMESTAMP(3);
