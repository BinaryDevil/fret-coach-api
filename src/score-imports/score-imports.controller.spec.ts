import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'node:http';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreImportsModule } from './score-imports.module';
import { ScoreStorageService } from './score-storage.service';

describe('ScoreImportsController', () => {
  let app: INestApplication;
  let server: Server;
  const prisma = {
    scoreImport: {
      findFirst: jest.fn(),
    },
    userSong: {
      delete: jest.fn(),
    },
  };
  const storage = {
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.scoreImport.findFirst.mockImplementation(({ where }: { where: { userId: string } }) =>
      where.userId === 'user-1'
        ? {
            id: 'import-1',
            userSongId: 'song-1',
            storageKey: 'user-scores/user-1/song-1/private.at',
          }
        : null,
    );
    storage.remove.mockResolvedValue(undefined);
    prisma.userSong.delete.mockResolvedValue({});
    const module = await Test.createTestingModule({
      imports: [ScoreImportsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ScoreStorageService)
      .useValue(storage)
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

  it('lets the authenticated owner delete a private arrangement', async () => {
    await request(server).delete('/score-imports/import-1').expect(204);

    expect(storage.remove).toHaveBeenCalledWith('user-scores/user-1/song-1/private.at');
    expect(prisma.userSong.delete).toHaveBeenCalledWith({ where: { id: 'song-1' } });
  });

  it('does not expose public discovery or visibility operations', async () => {
    await request(server).get('/public-scores').expect(404);
    await request(server).get('/public-scores/import-1').expect(404);
    await request(server).get('/public-scores/import-1/source').expect(404);
    await request(server).patch('/score-imports/import-1/visibility').expect(404);
  });

  it('does not let another user retrieve, download, or delete an arrangement', async () => {
    const asOtherUser = { 'x-user-id': 'user-2' };

    await request(server).get('/score-imports/import-1').set(asOtherUser).expect(404);
    await request(server).get('/score-imports/import-1/source').set(asOtherUser).expect(404);
    await request(server).delete('/score-imports/import-1').set(asOtherUser).expect(404);

    expect(storage.remove).not.toHaveBeenCalled();
    expect(prisma.userSong.delete).not.toHaveBeenCalled();
  });

  it('rejects a public-visibility field during private arrangement creation', async () => {
    await request(server)
      .post('/score-imports')
      .send({
        title: 'Private Song',
        format: 'ALPHA_TEX',
        fileName: 'private.at',
        mimeType: 'text/plain',
        sizeBytes: 100,
        isPublic: true,
      })
      .expect(400);

    expect(prisma.scoreImport.findFirst).not.toHaveBeenCalled();
  });
});
