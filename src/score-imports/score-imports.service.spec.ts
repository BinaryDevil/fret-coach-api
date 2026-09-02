import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ScoreFormat } from '@prisma/client';
import { ScoreEventGeneratorService } from '../scores/score-event-generator.service';
import { ScoreImportsService } from './score-imports.service';

describe('ScoreImportsService', () => {
  const userId = 'user-1';

  const createService = (overrides?: {
    scoreImport?: Record<string, unknown>;
    storageBytes?: Uint8Array;
  }) => {
    const prisma = {
      userSong: {
        create: jest.fn().mockResolvedValue({ id: 'song-1', userId, title: 'Private Song' }),
        delete: jest.fn().mockResolvedValue({}),
        findMany: jest.fn(),
      },
      scoreImport: {
        create: jest.fn().mockResolvedValue({ id: 'import-1' }),
        findFirst: jest.fn().mockResolvedValue(overrides?.scoreImport ?? null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      scoreImportTrack: {
        deleteMany: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const storage = {
      createSignedUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'https://upload.example' }),
      createSignedDownloadUrl: jest.fn().mockResolvedValue({
        sourceUrl: 'https://download.example',
        expiresInSeconds: 600,
      }),
      download: jest.fn().mockResolvedValue(overrides?.storageBytes ?? new Uint8Array()),
    };
    const service = new ScoreImportsService(
      prisma as never,
      storage as never,
      new ScoreEventGeneratorService(),
    );
    return { service, prisma, storage };
  };

  it('rejects an extension that does not match the declared score format', async () => {
    const { service, prisma } = createService();
    await expect(
      service.create(userId, {
        title: 'Private Song',
        format: ScoreFormat.GUITAR_PRO,
        fileName: 'song.musicxml',
        mimeType: 'application/xml',
        sizeBytes: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userSong.create).not.toHaveBeenCalled();
  });

  it('does not reveal another user’s import', async () => {
    const { service } = createService();
    await expect(service.get(userId, 'missing-import')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists only the owner’s imports with a lightweight timeline preview and cursor', async () => {
    const { service, prisma } = createService();
    prisma.scoreImport.findMany.mockResolvedValue([
      {
        id: 'import-2',
        status: 'READY',
        format: ScoreFormat.ALPHA_TEX,
        originalFileName: 'newer.at',
        parseError: null,
        createdAt: new Date('2026-09-02T12:00:00.000Z'),
        updatedAt: new Date('2026-09-02T12:01:00.000Z'),
        userSong: { id: 'song-2', title: 'Newer Song', artist: null },
        timeline: {
          version: 2,
          defaultBpm: 90,
          ticksPerQuarter: 960,
          tracks: [{ id: 't0', index: 0, name: 'Lead', instrument: 'GUITAR', tuning: [64] }],
          events: [{ id: 'm1-b1-t0-v0-e0' }],
        },
      },
      {
        id: 'import-1',
        status: 'FAILED',
        format: ScoreFormat.MUSIC_XML,
        originalFileName: 'older.xml',
        parseError: 'Invalid source',
        createdAt: new Date('2026-09-02T11:00:00.000Z'),
        updatedAt: new Date('2026-09-02T11:01:00.000Z'),
        userSong: { id: 'song-1', title: 'Older Song', artist: 'Artist' },
        timeline: null,
      },
    ]);

    const result = await service.list(userId, { limit: 1 });

    expect(prisma.scoreImport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 2,
      }),
    );
    expect(result).toMatchObject({
      items: [
        {
          id: 'import-2',
          song: { id: 'song-2', title: 'Newer Song' },
          timeline: { version: 2, defaultBpm: 90, tracks: [{ id: 't0' }] },
        },
      ],
    });
    expect(result.items[0].timeline).not.toHaveProperty('events');
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('maps import detail to song metadata and preserves event track IDs', async () => {
    const scoreImport = {
      id: 'import-1',
      status: 'READY',
      format: ScoreFormat.ALPHA_TEX,
      originalFileName: 'private.at',
      parseError: null,
      createdAt: new Date('2026-09-02T12:00:00.000Z'),
      updatedAt: new Date('2026-09-02T12:00:00.000Z'),
      userSong: { id: 'song-1', title: 'Private Song', artist: null },
      timeline: {
        version: 2,
        defaultBpm: 90,
        ticksPerQuarter: 960,
        tracks: [{ id: 't0', index: 0, name: 'Lead', instrument: 'GUITAR', tuning: [64] }],
        events: [{ id: 'm1-b1-t0-v0-e0', trackId: 't0', startTick: 0 }],
      },
      tracks: [
        {
          id: 'stored-track-1',
          sourceTrackId: 't0',
          trackIndex: 0,
          name: 'Lead',
          instrument: 'GUITAR',
          tuning: [64],
          capo: null,
        },
      ],
    };
    const { service } = createService({ scoreImport });

    await expect(service.get(userId, 'import-1')).resolves.toMatchObject({
      song: { id: 'song-1', title: 'Private Song' },
      timeline: { events: [{ id: 'm1-b1-t0-v0-e0', trackId: 't0' }] },
      tracks: [{ sourceTrackId: 't0' }],
    });
  });

  it('issues a source URL only for the owner of a ready import', async () => {
    const scoreImport = {
      id: 'import-1',
      userId,
      storageKey: 'user-scores/user-1/song-1/private.at',
      format: ScoreFormat.ALPHA_TEX,
      originalFileName: 'private.at',
      status: 'READY',
    };
    const { service, storage } = createService({ scoreImport });

    await expect(service.sourceUrl(userId, 'import-1')).resolves.toEqual({
      ...scoreImport,
      sourceUrl: 'https://download.example',
      expiresInSeconds: 600,
    });
    expect(storage.createSignedDownloadUrl).toHaveBeenCalledWith(scoreImport.storageKey);
  });

  it('parses an uploaded alphaTex score and persists canonical tracks', async () => {
    const scoreImport = {
      id: 'import-1',
      userId,
      storageKey: 'user-scores/user-1/song-1/private.at',
      format: ScoreFormat.ALPHA_TEX,
      status: 'UPLOAD_PENDING',
    };
    const { service, prisma, storage } = createService({
      scoreImport,
      storageBytes: new TextEncoder().encode('.\n:4 1.6 {sd} 2.6 {su} |'),
    });
    jest.spyOn(service, 'get').mockResolvedValue({ id: 'import-1' } as never);

    await expect(service.complete(userId, 'import-1')).resolves.toEqual({ id: 'import-1' });

    expect(storage.download).toHaveBeenCalledWith(scoreImport.storageKey);
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Promise), expect.any(Promise), expect.any(Promise)]),
    );
    expect(prisma.scoreImport.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'READY',
          eventVersion: 2,
          timeline: expect.objectContaining({
            tracks: expect.arrayContaining([expect.objectContaining({ id: 't0' })]),
            events: expect.arrayContaining([
              expect.objectContaining({ effects: [{ type: 'PICK_STROKE', direction: 'DOWN' }] }),
            ]),
          }),
        }),
      }),
    );
  });
});
