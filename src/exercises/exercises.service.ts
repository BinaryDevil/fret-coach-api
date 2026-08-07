import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListExercisesDto } from './dto/list-exercises.dto';
@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}
  list(query: ListExercisesDto) {
    return this.prisma.exercise.findMany({
      where: {
        isPublished: true,
        ...(query.type ? { type: query.type } : {}),
        ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      },
      select: {
        id: true,
        slug: true,
        type: true,
        difficulty: true,
        title: true,
        description: true,
        instructions: true,
        configuration: true,
        referenceAudioUrl: true,
        score: {
          select: {
            format: true,
            fileName: true,
            storageKey: true,
            timeSignature: true,
            defaultBpm: true,
            totalMeasures: true,
            backingTrackUrl: true,
            backingTrackOffsetMs: true,
          },
        },
        loopRegions: {
          select: { id: true, title: true, startMeasure: true, endMeasure: true, defaultBpm: true },
          orderBy: { startMeasure: 'asc' },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
  async get(id: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id, isPublished: true },
      select: {
        id: true,
        slug: true,
        type: true,
        difficulty: true,
        title: true,
        description: true,
        instructions: true,
        configuration: true,
        referenceAudioUrl: true,
        score: {
          select: {
            format: true,
            fileName: true,
            storageKey: true,
            content: true,
            timeSignature: true,
            defaultBpm: true,
            totalMeasures: true,
            backingTrackUrl: true,
            backingTrackOffsetMs: true,
          },
        },
        loopRegions: {
          select: { id: true, title: true, startMeasure: true, endMeasure: true, defaultBpm: true },
          orderBy: { startMeasure: 'asc' },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }
}
