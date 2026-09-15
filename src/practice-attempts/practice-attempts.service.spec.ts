import { PracticeNoteOutcome } from '@prisma/client';
import { PracticeAttemptsService } from './practice-attempts.service';

describe('PracticeAttemptsService', () => {
  const timeline = {
    version: 1,
    ticksPerQuarter: 960,
    totalTicks: 1920,
    totalMeasures: 1,
    timeSignature: '4/4',
    defaultBpm: 60,
    events: [
      {
        id: 'm1-b1-t0-v0-e0',
        measure: 1,
        beat: 1,
        startTick: 0,
        durationTicks: 960,
        ticksPerQuarter: 960,
        trackIndex: 0,
        voiceIndex: 0,
        pitches: [41],
        notes: [{ midi: 41 }],
        isRest: false,
      },
      {
        id: 'm1-b2-t0-v0-e1',
        measure: 1,
        beat: 2,
        startTick: 960,
        durationTicks: 960,
        ticksPerQuarter: 960,
        trackIndex: 0,
        voiceIndex: 0,
        pitches: [42],
        notes: [{ midi: 42 }],
        isRest: false,
      },
    ],
  };

  const dto = {
    clientRunId: '550e8400-e29b-41d4-a716-446655440000',
    exerciseId: 'exercise-1',
    scoreRevision: 'v1:score-hash',
    bpm: 60,
    countInBeats: 4,
    activeDurationMs: 2000,
    noteResults: [
      {
        timelineEventId: 'm1-b1-t0-v0-e0',
        eventIndex: 0,
        outcome: PracticeNoteOutcome.CORRECT,
        detectedMidi: 41,
        bend: {
          reachedTarget: true,
          peakMidi: 42,
          targetCentsError: -6,
          reachedTargetAtMs: 410,
          holdDurationMs: 180,
        },
      },
    ],
  };

  it('computes missing notes and progress in one persisted attempt', async () => {
    const create = jest.fn((input: { data: Record<string, unknown> }) => input.data);
    const tx = {
      practiceAttempt: { create },
      userExerciseProgress: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
    };
    const transaction = jest.fn((callback: (transactionClient: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    const prisma = {
      practiceAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      exercise: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exercise-1',
          configuration: { bpmRange: [40, 140] },
          score: { eventVersion: 1, eventSourceHash: 'score-hash', timeline },
        }),
      },
      $transaction: transaction,
    };
    const service = new PracticeAttemptsService(prisma as never);

    const attempt = await service.create('user-1', dto);

    expect(attempt).toMatchObject({
      totalTargetEvents: 2,
      correctCount: 1,
      missingCount: 1,
      wrongPitchCount: 0,
      extraNoteCount: 0,
      accuracyPercent: 50,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          noteResults: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ timelineEventId: 'm1-b2-t0-v0-e1', outcome: 'MISSING' }),
              expect.objectContaining({
                timelineEventId: 'm1-b1-t0-v0-e0',
                bend: expect.objectContaining({ peakMidi: 42, holdDurationMs: 180 }),
              }),
            ]),
          }),
        }),
      }),
    );
    expect(tx.userExerciseProgress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completedPasses: 1, totalActiveMs: 2000 }),
      }),
    );
  });

  it('returns the original attempt for an idempotent retry', async () => {
    const existing = { id: 'attempt-1', userId: 'user-1', noteResults: [] };
    const prisma = {
      practiceAttempt: { findUnique: jest.fn().mockResolvedValue(existing) },
      exercise: { findFirst: jest.fn() },
    };
    const service = new PracticeAttemptsService(prisma as never);

    await expect(service.create('user-1', dto)).resolves.toBe(existing);
    expect(prisma.exercise.findFirst).not.toHaveBeenCalled();
  });

  it('persists a private arrangement attempt for the selected track and measure range', async () => {
    const create = jest.fn((input: { data: Record<string, unknown> }) => input.data);
    const tx = { practiceAttempt: { create } };
    const prisma = {
      practiceAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      scoreImport: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'import-1',
          eventVersion: 3,
          sourceHash: 'private-score-hash',
          timeline: {
            ...timeline,
            version: 3,
            tracks: [{ id: 't0', index: 0, name: 'Lead', instrument: 'GUITAR', tuning: [64] }],
            events: timeline.events.map((event) => ({ ...event, trackId: 't0' })),
          },
        }),
      },
      $transaction: jest.fn((callback: (transactionClient: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new PracticeAttemptsService(prisma as never);

    const attempt = await service.create('user-1', {
      ...dto,
      exerciseId: undefined,
      scoreImportId: 'import-1',
      trackId: 't0',
      passageStartMeasure: 1,
      passageEndMeasure: 1,
      scoreRevision: 'v3:private-score-hash',
    });

    expect(attempt).toMatchObject({
      scoreImportId: 'import-1',
      trackId: 't0',
      passageStartMeasure: 1,
      passageEndMeasure: 1,
      totalTargetEvents: 2,
      accuracyPercent: 50,
    });
    expect(prisma.scoreImport.findFirst).toHaveBeenCalledWith({
      where: { id: 'import-1', userId: 'user-1', status: 'READY' },
      select: { id: true, eventVersion: true, sourceHash: true, timeline: true },
    });
  });
});
