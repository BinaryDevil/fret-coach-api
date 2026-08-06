import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  it('starts a streak and increments completed sessions', async () => {
    const update = jest.fn().mockResolvedValue({});
    const service = new ProgressService({
      userProgress: {
        upsert: jest
          .fn()
          .mockResolvedValue({ currentDayStreak: 0, longestDayStreak: 0, lastPracticedOn: null }),
        update,
      },
    } as never);
    await service.recordSession('user-1', 90);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          totalSessions: { increment: 1 },
          totalPracticeSeconds: { increment: 90 },
          currentDayStreak: 1,
          longestDayStreak: 1,
        }),
      }),
    );
  });
});
