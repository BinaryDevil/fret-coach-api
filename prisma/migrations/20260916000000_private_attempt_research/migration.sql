CREATE TYPE "AttemptCorrectionSubject" AS ENUM ('DIAGNOSIS', 'INTERVENTION');
CREATE TYPE "PilotTelemetryEventType" AS ENUM ('SETUP_OUTCOME', 'INPUT_QUALITY_OUTCOME', 'PASSAGE_SELECTED', 'ATTEMPT_STARTED', 'ATTEMPT_FINISHED', 'ATTEMPT_ABANDONED', 'ATTEMPT_UNASSESSABLE', 'REVIEW_SHOWN', 'CORRECTION_SUBMITTED', 'RETURNED');

CREATE TABLE "AttemptCorrection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "subject" "AttemptCorrectionSubject" NOT NULL,
  "isHelpful" BOOLEAN NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptCorrection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotTelemetryEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scoreImportId" TEXT NOT NULL,
  "attemptId" TEXT,
  "eventType" "PilotTelemetryEventType" NOT NULL,
  "outcome" TEXT,
  "reason" TEXT,
  "trackId" TEXT,
  "passageStartMeasure" INTEGER,
  "passageEndMeasure" INTEGER,
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PilotTelemetryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttemptCorrection_attemptId_createdAt_idx" ON "AttemptCorrection"("attemptId", "createdAt");
CREATE INDEX "AttemptCorrection_userId_createdAt_idx" ON "AttemptCorrection"("userId", "createdAt");
CREATE INDEX "PilotTelemetryEvent_scoreImportId_createdAt_idx" ON "PilotTelemetryEvent"("scoreImportId", "createdAt");
CREATE INDEX "PilotTelemetryEvent_userId_createdAt_idx" ON "PilotTelemetryEvent"("userId", "createdAt");
CREATE INDEX "PilotTelemetryEvent_attemptId_idx" ON "PilotTelemetryEvent"("attemptId");

ALTER TABLE "AttemptCorrection" ADD CONSTRAINT "AttemptCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttemptCorrection" ADD CONSTRAINT "AttemptCorrection_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotTelemetryEvent" ADD CONSTRAINT "PilotTelemetryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotTelemetryEvent" ADD CONSTRAINT "PilotTelemetryEvent_scoreImportId_fkey" FOREIGN KEY ("scoreImportId") REFERENCES "ScoreImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotTelemetryEvent" ADD CONSTRAINT "PilotTelemetryEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
