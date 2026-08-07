import { PracticeSessionsService } from './practice-sessions.service';
describe('PracticeSessionsService', () => {
  it('rejects a library exercise that has no playable score', async () => {
    const service = new PracticeSessionsService({ exercise: { findFirst: jest.fn().mockResolvedValue(null) } } as never, {} as never);
    await expect(service.create('user-1', { exerciseId: 'missing' })).rejects.toThrow('Playable exercise not found');
  });
});
