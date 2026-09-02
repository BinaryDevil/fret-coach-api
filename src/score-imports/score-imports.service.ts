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
import { ListScoreImportsDto } from './dto/list-score-imports.dto';
import { ScoreStorageService } from './score-storage.service';

const MAX_SCORE_FILE_BYTES = 10 * 1024 * 1024;

type Cursor = { createdAt: string; id: string };
type StoredTimeline = {
  version: number;
  defaultBpm: number;
  ticksPerQuarter: number;
  tracks: Array<{
    id: string;
    index: number;
    name: string;
    instrument: string;
    tuning: number[];
    capo?: number | null;
  }>;
  events: unknown[];
};

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

  async list(userId: string, query: ListScoreImportsDto) {
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const imports = await this.prisma.scoreImport.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        format: true,
        originalFileName: true,
        parseError: true,
        createdAt: true,
        updatedAt: true,
        timeline: true,
        userSong: { select: { id: true, title: true, artist: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });
    const hasMore = imports.length > query.limit;
    const items = imports.slice(0, query.limit);
    const finalItem = items.at(-1);
    return {
      items: items.map((scoreImport) => ({
        id: scoreImport.id,
        status: scoreImport.status,
        format: scoreImport.format,
        originalFileName: scoreImport.originalFileName,
        parseError: scoreImport.parseError,
        createdAt: scoreImport.createdAt,
        updatedAt: scoreImport.updatedAt,
        song: scoreImport.userSong,
        timeline: this.timelinePreview(scoreImport.timeline),
      })),
      nextCursor:
        hasMore && finalItem
          ? this.encodeCursor({ createdAt: finalItem.createdAt.toISOString(), id: finalItem.id })
          : null,
    };
  }

  async get(userId: string, importId: string) {
    const scoreImport = await this.prisma.scoreImport.findFirst({
      where: { id: importId, userId },
      select: {
        id: true,
        status: true,
        format: true,
        originalFileName: true,
        parseError: true,
        createdAt: true,
        updatedAt: true,
        timeline: true,
        userSong: { select: { id: true, title: true, artist: true } },
        tracks: {
          select: {
            id: true,
            sourceTrackId: true,
            trackIndex: true,
            name: true,
            instrument: true,
            tuning: true,
            capo: true,
          },
          orderBy: { trackIndex: 'asc' },
        },
      },
    });
    if (!scoreImport) throw new NotFoundException('Score import not found');
    return {
      id: scoreImport.id,
      status: scoreImport.status,
      format: scoreImport.format,
      originalFileName: scoreImport.originalFileName,
      parseError: scoreImport.parseError,
      createdAt: scoreImport.createdAt,
      updatedAt: scoreImport.updatedAt,
      song: scoreImport.userSong,
      timeline: scoreImport.timeline,
      tracks: scoreImport.tracks,
    };
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

  private timelinePreview(timeline: unknown) {
    if (!timeline || typeof timeline !== 'object') return null;
    const value = timeline as Partial<StoredTimeline>;
    if (typeof value.version !== 'number' || typeof value.defaultBpm !== 'number') return null;
    return {
      version: value.version,
      defaultBpm: value.defaultBpm,
      tracks: Array.isArray(value.tracks)
        ? value.tracks.map((track) => ({
            id: track.id,
            index: track.index,
            name: track.name,
            instrument: track.instrument,
            tuning: track.tuning,
            capo: track.capo ?? null,
          }))
        : [],
    };
  }

  private encodeCursor(cursor: Cursor) {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(encoded: string): Cursor {
    try {
      const cursor = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Cursor;
      if (!cursor.id || Number.isNaN(new Date(cursor.createdAt).getTime())) throw new Error();
      return cursor;
    } catch {
      throw new BadRequestException('Invalid score import cursor');
    }
  }
}
