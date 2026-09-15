import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'node:http';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PracticeAttemptsModule } from './practice-attempts.module';

import * as request from 'supertest';

describe('PracticeAttemptsController', () => {
  let app: INestApplication;
  let server: Server;
  let savedAttempt: Record<string, unknown> | null;

  const timeline = {
    version: 3,
    ticksPerQuarter: 960,
    totalTicks: 1920,
    totalMeasures: 1,
    timeSignature: '4/4',
    defaultBpm: 60,
    tracks: [{ id: 't0', index: 0, name: 'Lead', instrument: 'GUITAR', tuning: [64] }],
    events: [
      {
        id: 'm1-b1-t0-v0-e0',
        measure: 1,
        beat: 1,
        startTick: 0,
        durationTicks: 960,
        ticksPerQuarter: 960,
        trackIndex: 0,
        trackId: 't0',
        voiceIndex: 0,
        pitches: [41],
        notes: [{ midi: 41 }],
        isRest: false,
      },
    ],
  };
  const privateDto = {
    clientRunId: '550e8400-e29b-41d4-a716-446655440000',
    scoreImportId: 'import-1',
    trackId: 't0',
    passageStartMeasure: 1,
    passageEndMeasure: 1,
    scoreRevision: 'v3:private-score-hash',
    bpm: 60,
    countInBeats: 4,
    activeDurationMs: 1000,
    noteResults: [
      {
        timelineEventId: 'm1-b1-t0-v0-e0',
        eventIndex: 0,
        outcome: 'CORRECT',
        detectedMidi: 41,
        confidence: 0.93,
        timingOffsetMs: 12,
      },
    ],
  };
  const prisma = {
    practiceAttempt: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    scoreImport: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    savedAttempt = null;
    prisma.practiceAttempt.findUnique.mockResolvedValue(null);
    prisma.scoreImport.findFirst.mockImplementation(({ where }: { where: { userId: string } }) =>
      where.userId === 'user-1'
        ? {
            id: 'import-1',
            eventVersion: 3,
            sourceHash: 'private-score-hash',
            timeline,
          }
        : null,
    );
    prisma.practiceAttempt.findFirst.mockImplementation(
      ({ where }: { where: { userId: string } }) =>
        where.userId === 'user-1' ? savedAttempt : null,
    );
    prisma.$transaction.mockImplementation(
      (
        callback: (tx: {
          practiceAttempt: { create: (input: { data: Record<string, unknown> }) => unknown };
        }) => unknown,
      ) =>
        callback({
          practiceAttempt: {
            create: ({ data }: { data: Record<string, unknown> }) => {
              const noteResults = (data.noteResults as { create: unknown[] }).create;
              savedAttempt = { id: 'attempt-1', ...data, noteResults };
              return savedAttempt;
            },
          },
        }),
    );
    const module = await Test.createTestingModule({
      imports: [PrismaModule, PracticeAttemptsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { sub: req.header('x-user-id') ?? 'user-1', email: 'owner@example.com' };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
  });

  it('saves and retrieves validated private-passage evidence for its owner', async () => {
    const saved = await request(server).post('/practice-attempts').send(privateDto).expect(201);

    expect(saved.body).toMatchObject({
      scoreImportId: 'import-1',
      trackId: 't0',
      passageStartMeasure: 1,
      passageEndMeasure: 1,
      scoreRevision: 'v3:private-score-hash',
      totalTargetEvents: 1,
      correctCount: 1,
      accuracyPercent: 100,
    });
    const retrieved = await request(server).get('/practice-attempts/attempt-1').expect(200);
    const retrievedAttempt = retrieved.body as { noteResults: unknown[] };
    expect(retrievedAttempt.noteResults[0]).toMatchObject({
      timelineEventId: 'm1-b1-t0-v0-e0',
      confidence: 0.93,
      timingOffsetMs: 12,
    });
  });

  it('rejects another player’s arrangement and attempt history', async () => {
    await request(server)
      .post('/practice-attempts')
      .set('x-user-id', 'user-2')
      .send(privateDto)
      .expect(404);
    await request(server)
      .get('/practice-attempts/attempt-1')
      .set('x-user-id', 'user-2')
      .expect(404);
  });

  it('rejects evidence for an event outside the selected private passage', async () => {
    await request(server)
      .post('/practice-attempts')
      .send({
        ...privateDto,
        noteResults: [{ ...privateDto.noteResults[0], timelineEventId: 'outside-the-passage' }],
      })
      .expect(400);
  });

  it('rejects a private attempt against a stale arrangement revision', async () => {
    await request(server)
      .post('/practice-attempts')
      .send({ ...privateDto, scoreRevision: 'v2:old-score-hash' })
      .expect(409);
  });

  it('returns the original private attempt for an idempotent retry', async () => {
    const existing = { id: 'attempt-1', userId: 'user-1', noteResults: [] };
    prisma.practiceAttempt.findUnique.mockResolvedValue(existing);

    await request(server).post('/practice-attempts').send(privateDto).expect(201, existing);

    expect(prisma.scoreImport.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
