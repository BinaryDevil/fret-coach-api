import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateRecordingDto } from './dto/create-recording.dto';
@Injectable()
export class PracticeSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}
  async create(userId: string, dto: CreateSessionDto) {
    if (Boolean(dto.exerciseId) === Boolean(dto.pieceTitle))
      throw new BadRequestException('Provide exactly one of exerciseId or pieceTitle');
    if (dto.exerciseId) {
      const exercise = await this.prisma.exercise.findFirst({
        where: { id: dto.exerciseId, isPublished: true },
      });
      if (!exercise) throw new NotFoundException('Exercise not found');
    }
    return this.prisma.practiceSession.create({
      data: {
        userId,
        exerciseId: dto.exerciseId,
        pieceTitle: dto.pieceTitle,
        sheetMusicUrl: dto.sheetMusicUrl,
        backingTrackUrl: dto.backingTrackUrl,
      },
      include: { exercise: true },
    });
  }
  async addRecording(userId: string, sessionId: string, dto: CreateRecordingDto) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId, status: 'IN_PROGRESS' },
    });
    if (!session) throw new NotFoundException('Active practice session not found');
    return this.prisma.performanceRecording.create({ data: { sessionId, ...dto } });
  }
  async complete(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Practice session not found');
    const completed = await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: { recordings: { select: { durationMs: true } } },
    });
    await this.progress.recordSession(
      userId,
      completed.recordings?.reduce(
        (total, recording) => total + Math.floor((recording.durationMs ?? 0) / 1000),
        0,
      ) ?? 0,
    );
    return completed;
  }
}
