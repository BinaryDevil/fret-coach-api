import { PracticeSessionsService } from './practice-sessions.service';

describe('PracticeSessionsService', () => {
  it('requires exactly one target: a library exercise or a song', async () => {
    const service = new PracticeSessionsService({} as never, {} as never);
    await expect(service.create('user-1', {})).rejects.toThrow(
      'Provide exactly one of exerciseId or pieceTitle',
    );
    await expect(
      service.create('user-1', { exerciseId: 'exercise-1', pieceTitle: 'My Song' }),
    ).rejects.toThrow('Provide exactly one of exerciseId or pieceTitle');
  });
});
