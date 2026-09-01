CREATE TYPE "PracticeAttemptStatus" AS ENUM ('COMPLETED', 'ABANDONED');
CREATE TYPE "PracticeNoteOutcome" AS ENUM ('CORRECT', 'WRONG_PITCH', 'MISSING', 'EXTRA_NOTE');

CREATE TABLE "PracticeAttempt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "clientRunId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "loopRegionId" TEXT,
  "scoreRevision" TEXT NOT NULL,
  "status" "PracticeAttemptStatus" NOT NULL DEFAULT 'COMPLETED',
  "bpm" INTEGER NOT NULL,
  "countInBeats" INTEGER NOT NULL,
  "activeDurationMs" INTEGER NOT NULL,
  "totalTargetEvents" INTEGER NOT NULL,
  "correctCount" INTEGER NOT NULL,
  "wrongPitchCount" INTEGER NOT NULL,
  "missingCount" INTEGER NOT NULL,
  "extraNoteCount" INTEGER NOT NULL DEFAULT 0,
  "accuracyPercent" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeNoteResult" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" TEXT NOT NULL,
  "timelineEventId" TEXT NOT NULL,
  "eventIndex" INTEGER NOT NULL,
  "measure" INTEGER NOT NULL,
  "beat" INTEGER NOT NULL,
  "startTick" INTEGER NOT NULL,
  "expectedPitches" INTEGER[] NOT NULL,
  "outcome" "PracticeNoteOutcome" NOT NULL,
  "detectedMidi" INTEGER,
  "correctedMidi" INTEGER,
  "centsOffset" INTEGER,
  "octaveShift" INTEGER,
  "confidence" DOUBLE PRECISION,
  "timingOffsetMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeNoteResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserExerciseProgress" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "completedPasses" INTEGER NOT NULL DEFAULT 0,
  "totalActiveMs" INTEGER NOT NULL DEFAULT 0,
  "bestAccuracyPercent" INTEGER NOT NULL DEFAULT 0,
  "bestBpm" INTEGER NOT NULL DEFAULT 0,
  "latestAccuracyPercent" INTEGER,
  "lastPracticedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserExerciseProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeAttempt_clientRunId_key" ON "PracticeAttempt"("clientRunId");
CREATE INDEX "PracticeAttempt_userId_completedAt_idx" ON "PracticeAttempt"("userId", "completedAt");
CREATE INDEX "PracticeAttempt_userId_exerciseId_completedAt_idx" ON "PracticeAttempt"("userId", "exerciseId", "completedAt");
CREATE UNIQUE INDEX "PracticeNoteResult_attemptId_timelineEventId_key" ON "PracticeNoteResult"("attemptId", "timelineEventId");
CREATE INDEX "PracticeNoteResult_attemptId_eventIndex_idx" ON "PracticeNoteResult"("attemptId", "eventIndex");
CREATE UNIQUE INDEX "UserExerciseProgress_userId_exerciseId_key" ON "UserExerciseProgress"("userId", "exerciseId");
CREATE INDEX "UserExerciseProgress_userId_lastPracticedAt_idx" ON "UserExerciseProgress"("userId", "lastPracticedAt");

ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_loopRegionId_fkey" FOREIGN KEY ("loopRegionId") REFERENCES "LoopRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeNoteResult" ADD CONSTRAINT "PracticeNoteResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserExerciseProgress" ADD CONSTRAINT "UserExerciseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserExerciseProgress" ADD CONSTRAINT "UserExerciseProgress_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
