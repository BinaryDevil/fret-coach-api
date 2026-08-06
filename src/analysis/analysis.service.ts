import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}
  async queue(userId: string, recordingId: string) {
    const recording = await this.prisma.performanceRecording.findFirst({
      where: { id: recordingId, session: { userId } },
      include: { analysis: true },
    });
    if (!recording) throw new NotFoundException('Recording not found');
    if (recording.analysis) return recording.analysis;
    return this.prisma.performanceAnalysis.create({ data: { recordingId } });
  }
  async get(userId: string, recordingId: string) {
    const recording = await this.prisma.performanceRecording.findFirst({
      where: { id: recordingId, session: { userId } },
      include: { analysis: { include: { feedback: { orderBy: { startMs: 'asc' } } } } },
    });
    if (!recording) throw new NotFoundException('Recording not found');
    return recording.analysis ?? { status: 'NOT_REQUESTED' };
  }
}
