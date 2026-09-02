import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreEventGeneratorService } from '../scores/score-event-generator.service';
import { CreateScoreImportDto } from './dto/create-score-import.dto';
import { ScoreStorageService } from './score-storage.service';

const MAX_SCORE_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class ScoreImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ScoreStorageService,
    private readonly scoreEventGenerator: ScoreEventGeneratorService,
  ) {}

  async create(userId: string, dto: CreateScoreImportDto) {
    this.validateFileName(dto.fileName, dto.format);
    const song = await this.prisma.userSong.create({
      data: { userId, title: dto.title.trim(), artist: dto.artist?.trim() || null },
    });
    const storageKey = `user-scores/${userId}/${song.id}/${this.safeFileName(dto.fileName)}`;
    const scoreImport = await this.prisma.scoreImport.create({
      data: {
        userSongId: song.id,
        userId,
        format: dto.format,
        originalFileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey,
      },
    });
    try {
      const upload = await this.storage.createSignedUploadUrl(storageKey, dto.mimeType);
      return { song, scoreImport, upload };
    } catch (error) {
      await this.prisma.userSong.delete({ where: { id: song.id } });
      throw error;
    }
  }

  async complete(userId: string, importId: string) {
    const scoreImport = await this.prisma.scoreImport.findFirst({
      where: { id: importId, userId },
    });
    if (!scoreImport) throw new NotFoundException('Score import not found');
    if (scoreImport.status === 'READY') return this.get(userId, importId);
    await this.prisma.scoreImport.update({
      where: { id: importId },
      data: { status: 'PROCESSING', parseError: null },
    });
    try {
      const bytes = await this.storage.download(scoreImport.storageKey);
      if (!bytes.length) throw new BadRequestException('Uploaded score file is empty');
      if (bytes.length > MAX_SCORE_FILE_BYTES)
        throw new PayloadTooLargeException('Score file is too large');
      const timeline = this.scoreEventGenerator.generateFromBytes(scoreImport.format, bytes, {
        defaultBpm: 120,
        timeSignature: '4/4',
      });
      await this.prisma.$transaction([
        this.prisma.scoreImport.update({
          where: { id: importId },
          data: {
            status: 'READY',
            sourceHash: createHash('sha256').update(bytes).digest('hex'),
            eventVersion: timeline.version,
            timeline,
            parseError: null,
            processedAt: new Date(),
          },
        }),
        this.prisma.scoreImportTrack.deleteMany({ where: { scoreImportId: importId } }),
        this.prisma.scoreImportTrack.createMany({
          data: timeline.tracks.map((track) => ({
            scoreImportId: importId,
            sourceTrackId: track.id,
            trackIndex: track.index,
            name: track.name,
            instrument: track.instrument,
            tuning: track.tuning,
            capo: track.capo,
          })),
        }),
      ]);
      return this.get(userId, importId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown score parsing error';
      await this.prisma.scoreImport.update({
        where: { id: importId },
        data: { status: 'FAILED', parseError: message, processedAt: new Date() },
      });
      if (error instanceof PayloadTooLargeException || error instanceof BadRequestException)
        throw error;
      throw new BadRequestException(`Score parsing failed: ${message}`);
    }
  }

  async list(userId: string) {
    return this.prisma.userSong.findMany({
      where: { userId },
      include: {
        imports: {
          select: {
            id: true,
            status: true,
            format: true,
            originalFileName: true,
            eventVersion: true,
            parseError: true,
            createdAt: true,
            processedAt: true,
            tracks: { orderBy: { trackIndex: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async get(userId: string, importId: string) {
    const scoreImport = await this.prisma.scoreImport.findFirst({
      where: { id: importId, userId },
      include: { userSong: true, tracks: { orderBy: { trackIndex: 'asc' } } },
    });
    if (!scoreImport) throw new NotFoundException('Score import not found');
    return scoreImport;
  }

  async sourceUrl(userId: string, importId: string) {
    const scoreImport = await this.prisma.scoreImport.findFirst({
      where: { id: importId, userId },
      select: { id: true, storageKey: true, status: true, format: true, originalFileName: true },
    });
    if (!scoreImport) throw new NotFoundException('Score import not found');
    if (scoreImport.status !== 'READY')
      throw new BadRequestException('The score source is not ready for practice');
    return {
      ...scoreImport,
      ...(await this.storage.createSignedDownloadUrl(scoreImport.storageKey)),
    };
  }

  private validateFileName(fileName: string, format: CreateScoreImportDto['format']) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const valid =
      (format === 'GUITAR_PRO' && ['gp', 'gp3', 'gp4', 'gp5', 'gpx'].includes(extension ?? '')) ||
      (format === 'MUSIC_XML' && ['musicxml', 'xml'].includes(extension ?? '')) ||
      (format === 'ALPHA_TEX' && ['alphatex', 'at', 'txt'].includes(extension ?? ''));
    if (!valid)
      throw new BadRequestException('File extension does not match the selected score format');
  }

  private safeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}
