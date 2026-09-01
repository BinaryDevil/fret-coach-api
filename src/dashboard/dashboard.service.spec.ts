import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns personalized dashboard values from persisted progress and attempts', async () => {
    const prisma = {
      userProgress: { findUnique: jest.fn().mockResolvedValue({ currentDayStreak: 4 }) },
      practiceAttempt: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { accuracyPercent: 87.5 },
          _sum: { activeDurationMs: 184000 },
        }),
        findFirst: jest.fn().mockResolvedValue({
          bpm: 72,
          accuracyPercent: 92,
          exercise: {
            id: 'exercise-1',
            slug: 'chromatic-1-2-3-4',
            title: 'Spider exercise',
            configuration: { targetBpm: 60 },
          },
        }),
      },
      exercise: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'exercise-1',
            slug: 'chromatic-1-2-3-4',
            title: 'Spider exercise',
            configuration: { targetBpm: 60 },
          },
        ]),
      },
    };
    const service = new DashboardService(prisma as never);

    await expect(service.summary('user-1')).resolves.toMatchObject({
      nextPractice: { id: 'exercise-1', targetBpm: 72 },
      stats: {
        currentDayStreak: 4,
        averageAccuracyPercent: 88,
        playedThisWeekMs: 184000,
      },
      recommendations: [{ rank: 1, id: 'exercise-1', targetBpm: 60 }],
    });
  });
});
