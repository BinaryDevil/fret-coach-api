import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { CreateSessionDto } from './dto/create-session.dto';
@Injectable()
export class PracticeSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
  ) {}
  async create(userId: string, dto: CreateSessionDto) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: dto.exerciseId, isPublished: true },
      include: { score: true },
    });
    if (!exercise?.score) throw new NotFoundException('Playable exercise not found');
    const loopRegion = dto.loopRegionId
      ? await this.prisma.loopRegion.findFirst({
          where: { id: dto.loopRegionId, exerciseId: dto.exerciseId },
        })
      : null;
    if (dto.loopRegionId && !loopRegion)
      throw new BadRequestException('Loop region does not belong to exercise');
    return this.prisma.practiceSession.create({
      data: {
        userId,
        exerciseId: dto.exerciseId,
        loopRegionId: dto.loopRegionId,
        targetBpm: dto.targetBpm ?? loopRegion?.defaultBpm ?? exercise.score.defaultBpm,
      },
      include: { exercise: { include: { score: true } }, loopRegion: true },
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
      where: { id: sessionId, userId, status: 'IN_PROGRESS' },
    });
    if (!session) throw new NotFoundException('Active practice session not found');
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    );
    const completed = await this.prisma.practiceSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', completedAt: new Date(), durationSeconds },
    });
    await this.progress.recordSession(userId, durationSeconds);
    return completed;
  }
}
