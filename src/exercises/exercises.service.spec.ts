import { ScoreEventGeneratorService } from '../scores/score-event-generator.service';
import { ScoreFormat } from '@prisma/client';
import { ExercisesService } from './exercises.service';

describe('ExercisesService', () => {
  it('returns a timeline only on exercise detail, not the library list', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue({ id: 'exercise-1' });
    const service = new ExercisesService(
      { exercise: { findMany, findFirst } } as never,
      new ScoreEventGeneratorService(),
    );

    await service.list({});
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          score: { select: expect.not.objectContaining({ timeline: true }) },
        }),
      }),
    );

    await service.get('exercise-1');
    expect(findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          score: { select: expect.objectContaining({ timeline: true }) },
        }),
      }),
    );
  });

  it('regenerates and persists a timeline when score source data has changed', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'score-1' });
    const service = new ExercisesService(
      {
        exerciseScore: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'score-1',
            format: ScoreFormat.ALPHA_TEX,
            content: '.\n:4 1.6 |',
            storageKey: null,
            defaultBpm: 60,
            timeSignature: '4/4',
            eventVersion: 1,
            eventSourceHash: 'old-source-hash',
          }),
          update,
        },
      } as never,
      new ScoreEventGeneratorService(),
    );

    await service.rebuildScoreTimeline('score-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'score-1' },
        data: expect.objectContaining({
          eventVersion: 1,
          eventSourceHash: expect.any(String),
          eventGeneratedAt: expect.any(Date),
          timeline: expect.objectContaining({ events: expect.any(Array) }),
        }),
      }),
    );
  });
});
