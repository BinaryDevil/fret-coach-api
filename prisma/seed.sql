-- Run after `npm run prisma:deploy`: psql "$DATABASE_URL" -f prisma/seed.sql
-- The TypeScript seed (`npm run prisma:seed`) is the canonical development seed.
-- This SQL equivalent also writes the version-1 generated timeline for the Spider score.

INSERT INTO "Exercise" ("id","slug","type","difficulty","title","description","instructions","configuration","isPublished","createdAt","updatedAt") VALUES ('seed-chromatic','chromatic-1-2-3-4','CHROMATIC','BEGINNER','1-2-3-4 Full-Range Spider','A full-range Spider exercise from the low E string to the high E string and back, training left-hand independence and picking synchronization.','Play 1-2-3-4 from the low E string to the high E string, then return to the low E string. Start at 60 BPM and increase by 5 BPM after each clean repetition.','{"targetBpm":60,"bpmRange":[40,140]}'::jsonb,true,NOW(),NOW()) ON CONFLICT ("slug") DO UPDATE SET "title" = EXCLUDED."title", "description" = EXCLUDED."description", "instructions" = EXCLUDED."instructions", "configuration" = EXCLUDED."configuration", "updatedAt" = NOW();

WITH event_source AS (
  SELECT midi, string_number, fret, ordinality
  FROM unnest(
    ARRAY[41,42,43,44,46,47,48,49,51,52,53,54,56,57,58,59,60,61,62,63,65,66,67,68,68,67,66,65,63,62,61,60,59,58,57,56,54,53,52,51,49,48,47,46,44,43,42,41]::integer[],
    ARRAY[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,6,6,6,6,5,5,5,5,4,4,4,4,3,3,3,3,2,2,2,2,1,1,1,1]::integer[],
    ARRAY[1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,4,3,2,1,4,3,2,1,4,3,2,1,4,3,2,1,4,3,2,1,4,3,2,1]::integer[]
  ) WITH ORDINALITY AS events(midi, string_number, fret, ordinality)
), timeline AS (
  SELECT jsonb_build_object(
    'version', 1,
    'ticksPerQuarter', 960,
    'totalTicks', 46080,
    'totalMeasures', 12,
    'timeSignature', '4/4',
    'defaultBpm', 60,
    'events', jsonb_agg(jsonb_build_object(
      'id', format('m%s-b%s-t0-v0-e%s', ((ordinality - 1) / 4) + 1, ((ordinality - 1) % 4) + 1, ordinality - 1),
      'measure', ((ordinality - 1) / 4) + 1,
      'beat', ((ordinality - 1) % 4) + 1,
      'startTick', (ordinality - 1) * 960,
      'durationTicks', 960,
      'ticksPerQuarter', 960,
      'trackIndex', 0,
      'voiceIndex', 0,
      'pitches', jsonb_build_array(midi),
      'notes', jsonb_build_array(jsonb_build_object('midi', midi, 'string', string_number, 'fret', fret)),
      'isRest', false
    ) ORDER BY ordinality)
  ) AS data
  FROM event_source
)
INSERT INTO "ExerciseScore" ("id","exerciseId","format","content","timeSignature","defaultBpm","totalMeasures","eventVersion","eventSourceHash","timeline","eventGeneratedAt","createdAt","updatedAt")
SELECT 'seed-chromatic-score','seed-chromatic','ALPHA_TEX',E'\\title "1-2-3-4 Full-Range Spider"\n\\tempo 60\n.\n:4 1.6 2.6 3.6 4.6 | 1.5 2.5 3.5 4.5 | 1.4 2.4 3.4 4.4 | 1.3 2.3 3.3 4.3 | 1.2 2.2 3.2 4.2 | 1.1 2.1 3.1 4.1 | 4.1 3.1 2.1 1.1 | 4.2 3.2 2.2 1.2 | 4.3 3.3 2.3 1.3 | 4.4 3.4 2.4 1.4 | 4.5 3.5 2.5 1.5 | 4.6 3.6 2.6 1.6 |','4/4',60,12,1,'33318dabb1b8069fd08832ed0a1db5c55f7cb6bd050ef02e53a32fb92eabdbe5',data,NOW(),NOW(),NOW()
FROM timeline
ON CONFLICT ("exerciseId") DO UPDATE SET "content" = EXCLUDED."content", "timeSignature" = EXCLUDED."timeSignature", "defaultBpm" = EXCLUDED."defaultBpm", "totalMeasures" = EXCLUDED."totalMeasures", "eventVersion" = EXCLUDED."eventVersion", "eventSourceHash" = EXCLUDED."eventSourceHash", "timeline" = EXCLUDED."timeline", "eventGenerationError" = NULL, "eventGeneratedAt" = NOW(), "updatedAt" = NOW();

UPDATE "LoopRegion" SET "title" = 'Full Loop', "startMeasure" = 1, "endMeasure" = 12, "defaultBpm" = 60, "updatedAt" = NOW() WHERE "exerciseId" = 'seed-chromatic' AND "startMeasure" = 1 AND "endMeasure" IN (2, 12);
INSERT INTO "LoopRegion" ("id","exerciseId","title","startMeasure","endMeasure","defaultBpm","createdAt","updatedAt") SELECT 'seed-chromatic-loop','seed-chromatic','Full Loop',1,12,60,NOW(),NOW() WHERE NOT EXISTS (SELECT 1 FROM "LoopRegion" WHERE "exerciseId" = 'seed-chromatic' AND "title" = 'Full Loop');
