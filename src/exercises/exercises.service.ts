import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreEventGeneratorService } from '../scores/score-event-generator.service';
import { ListExercisesDto } from './dto/list-exercises.dto';
@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreEventGenerator: ScoreEventGeneratorService,
  ) {}
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
            eventVersion: true,
            eventSourceHash: true,
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
            eventVersion: true,
            eventSourceHash: true,
            timeline: true,
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
  async getBySlug(slug: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { slug, isPublished: true },
      select: { id: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return this.get(exercise.id);
  }

  /** Internal rebuild hook for imports, content updates, and parser upgrades. */
  async rebuildScoreTimeline(scoreId: string, force = false) {
    const score = await this.prisma.exerciseScore.findUnique({ where: { id: scoreId } });
    if (!score) throw new NotFoundException('Exercise score not found');
    const input = {
      format: score.format,
      content: score.content,
      storageKey: score.storageKey,
      defaultBpm: score.defaultBpm,
      timeSignature: score.timeSignature,
    };
    if (
      !force &&
      !this.scoreEventGenerator.shouldGenerate(input, score.eventVersion, score.eventSourceHash)
    )
      return score;
    try {
      const timeline = await this.scoreEventGenerator.generate(input);
      return this.prisma.exerciseScore.update({
        where: { id: scoreId },
        data: {
          eventVersion: timeline.version,
          eventSourceHash: this.scoreEventGenerator.sourceHash(input),
          timeline,
          eventGenerationError: null,
          eventGeneratedAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown score event generation error';
      await this.prisma.exerciseScore.update({
        where: { id: scoreId },
        data: { eventGenerationError: message },
      });
      throw error;
    }
  }
}
