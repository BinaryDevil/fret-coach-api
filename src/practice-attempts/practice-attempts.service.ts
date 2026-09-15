import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PracticeNoteOutcome, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  scoreRevision,
  ScoreNoteEvent,
  ScoreTimeline,
} from '../scores/score-event-generator.service';
import {
  CreatePracticeAttemptDto,
  CreatePracticeNoteResultDto,
} from './dto/create-practice-attempt.dto';
import { ListPracticeAttemptsDto } from './dto/list-practice-attempts.dto';

type TargetEvent = ScoreNoteEvent & { eventIndex: number };

type PersistedNoteResult = {
  timelineEventId: string;
  eventIndex: number;
  measure: number;
  beat: number;
  startTick: number;
  expectedPitches: number[];
  outcome: PracticeNoteOutcome;
  detectedMidi?: number;
  correctedMidi?: number;
  centsOffset?: number;
  octaveShift?: number;
  confidence?: number;
  timingOffsetMs?: number;
  bend?: {
    reachedTarget: boolean;
    peakMidi: number;
    targetCentsError: number;
    reachedTargetAtMs?: number;
    holdDurationMs: number;
  };
};

@Injectable()
export class PracticeAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePracticeAttemptDto) {
    const existing = await this.prisma.practiceAttempt.findUnique({
      where: { clientRunId: dto.clientRunId },
      include: { noteResults: { orderBy: { eventIndex: 'asc' } } },
    });
    if (existing) {
      if (existing.userId !== userId)
        throw new ConflictException('clientRunId has already been used');
      return existing;
    }

    const isPrivateAttempt = dto.scoreImportId !== undefined;
    if (isPrivateAttempt === (dto.exerciseId !== undefined))
      throw new BadRequestException(
        'An attempt must target either an exercise or a private arrangement',
      );

    let exerciseId: string | undefined;
    let scoreImportId: string | undefined;
    let loopRegionId: string | undefined;
    let trackId: string | undefined;
    let passageStartMeasure: number | undefined;
    let passageEndMeasure: number | undefined;
    let currentRevision: string;
    let targetEvents: TargetEvent[];

    if (isPrivateAttempt) {
      const passage = this.privatePassage(dto);
      const scoreImport = await this.prisma.scoreImport.findFirst({
        where: { id: dto.scoreImportId, userId, status: 'READY' },
        select: { id: true, eventVersion: true, sourceHash: true, timeline: true },
      });
      if (!scoreImport) throw new NotFoundException('Private arrangement not found');
      currentRevision = scoreRevision(scoreImport.eventVersion, scoreImport.sourceHash);
      if (dto.scoreRevision !== currentRevision)
        throw new ConflictException(
          'Score revision is stale; reload the arrangement before saving',
        );
      const timeline = this.readTimeline(scoreImport.timeline);
      if (!timeline.tracks.some((track) => track.id === passage.trackId))
        throw new BadRequestException('The selected track does not belong to the arrangement');
      if (passage.endMeasure > timeline.totalMeasures)
        throw new BadRequestException('The selected passage is outside the arrangement');
      scoreImportId = scoreImport.id;
      trackId = passage.trackId;
      passageStartMeasure = passage.startMeasure;
      passageEndMeasure = passage.endMeasure;
      targetEvents = this.targetEvents(
        timeline,
        passage.startMeasure,
        passage.endMeasure,
        passage.trackId,
      );
    } else {
      if (dto.trackId || dto.passageStartMeasure || dto.passageEndMeasure)
        throw new BadRequestException(
          'Private passage fields are not valid for an exercise attempt',
        );
      const exercise = await this.prisma.exercise.findFirst({
        where: { id: dto.exerciseId, isPublished: true },
        include: { score: true },
      });
      if (!exercise?.score) throw new NotFoundException('Playable exercise not found');
      currentRevision = scoreRevision(exercise.score.eventVersion, exercise.score.eventSourceHash);
      if (dto.scoreRevision !== currentRevision)
        throw new ConflictException('Score revision is stale; reload the exercise before saving');
      const timeline = this.readTimeline(exercise.score.timeline);
      const loopRegion = dto.loopRegionId
        ? await this.prisma.loopRegion.findFirst({
            where: { id: dto.loopRegionId, exerciseId: exercise.id },
          })
        : null;
      if (dto.loopRegionId && !loopRegion)
        throw new BadRequestException('Loop region does not belong to exercise');
      this.assertBpmInRange(dto.bpm, exercise.configuration);
      exerciseId = exercise.id;
      loopRegionId = loopRegion?.id;
      targetEvents = this.targetEvents(timeline, loopRegion?.startMeasure, loopRegion?.endMeasure);
    }
    if (targetEvents.length === 0)
      throw new BadRequestException('The selected score range has no scoreable note events');

    const noteResults = this.buildResults(dto.noteResults, targetEvents);
    const counts = this.countResults(noteResults, targetEvents.length);
    const completedAt = new Date();
    const attemptData = {
      clientRunId: dto.clientRunId,
      userId,
      exerciseId,
      scoreImportId,
      loopRegionId,
      trackId,
      passageStartMeasure,
      passageEndMeasure,
      scoreRevision: currentRevision,
      bpm: dto.bpm,
      countInBeats: dto.countInBeats,
      activeDurationMs: dto.activeDurationMs,
      totalTargetEvents: targetEvents.length,
      correctCount: counts.correctCount,
      wrongPitchCount: counts.wrongPitchCount,
      missingCount: counts.missingCount,
      extraNoteCount: counts.extraNoteCount,
      accuracyPercent: counts.accuracyPercent,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
      completedAt,
      noteResults: { create: noteResults },
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const attempt = await tx.practiceAttempt.create({
          data: attemptData,
          include: { noteResults: { orderBy: { eventIndex: 'asc' } } },
        });
        if (exerciseId) {
          await this.updateExerciseProgress(
            tx,
            userId,
            exerciseId,
            dto.activeDurationMs,
            counts.accuracyPercent,
            dto.bpm,
            completedAt,
          );
        }
        return attempt;
      });
    } catch (error) {
      if (this.isUniqueClientRunError(error)) {
        const retry = await this.prisma.practiceAttempt.findUnique({
          where: { clientRunId: dto.clientRunId },
          include: { noteResults: { orderBy: { eventIndex: 'asc' } } },
        });
        if (retry?.userId === userId) return retry;
      }
      throw error;
    }
  }

  async list(userId: string, query: ListPracticeAttemptsDto) {
    const attempts = await this.prisma.practiceAttempt.findMany({
      where: {
        userId,
        ...(query.exerciseId ? { exerciseId: query.exerciseId } : {}),
        ...(query.scoreImportId ? { scoreImportId: query.scoreImportId } : {}),
      },
      select: {
        id: true,
        exerciseId: true,
        scoreImportId: true,
        loopRegionId: true,
        trackId: true,
        passageStartMeasure: true,
        passageEndMeasure: true,
        scoreRevision: true,
        status: true,
        bpm: true,
        activeDurationMs: true,
        totalTargetEvents: true,
        correctCount: true,
        wrongPitchCount: true,
        missingCount: true,
        extraNoteCount: true,
        accuracyPercent: true,
        completedAt: true,
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.limit + 1,
    });
    const hasNextPage = attempts.length > query.limit;
    const items = hasNextPage ? attempts.slice(0, query.limit) : attempts;
    return { items, nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null };
  }

  async get(userId: string, id: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: { id, userId },
      include: { noteResults: { orderBy: { eventIndex: 'asc' } } },
    });
    if (!attempt) throw new NotFoundException('Practice attempt not found');
    return attempt;
  }

  async exerciseProgress(userId: string, exerciseId: string) {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: exerciseId, isPublished: true },
      select: { id: true },
    });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return this.prisma.userExerciseProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });
  }

  private readTimeline(value: Prisma.JsonValue | null): ScoreTimeline {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('Exercise score has no generated timeline');
    const timeline = value as unknown as ScoreTimeline;
    if (!Array.isArray(timeline.events) || timeline.version < 1)
      throw new BadRequestException('Exercise score timeline is invalid');
    return timeline;
  }

  private targetEvents(
    timeline: ScoreTimeline,
    startMeasure?: number,
    endMeasure?: number,
    trackId?: string,
  ) {
    return timeline.events
      .map((event, eventIndex) => ({ ...event, eventIndex }))
      .filter(
        (event) =>
          !event.isRest &&
          event.pitches.length > 0 &&
          (startMeasure === undefined || event.measure >= startMeasure) &&
          (endMeasure === undefined || event.measure <= endMeasure) &&
          (trackId === undefined || event.trackId === trackId),
      );
  }

  private privatePassage(dto: CreatePracticeAttemptDto) {
    if (
      !dto.trackId ||
      dto.passageStartMeasure === undefined ||
      dto.passageEndMeasure === undefined ||
      dto.passageStartMeasure > dto.passageEndMeasure ||
      dto.loopRegionId
    )
      throw new BadRequestException('A private attempt requires a valid track and measure range');
    return {
      trackId: dto.trackId,
      startMeasure: dto.passageStartMeasure,
      endMeasure: dto.passageEndMeasure,
    };
  }

  private buildResults(
    submitted: CreatePracticeNoteResultDto[],
    targetEvents: TargetEvent[],
  ): PersistedNoteResult[] {
    const targetsById = new Map(targetEvents.map((event) => [event.id, event]));
    const submittedIds = new Set<string>();
    const results: PersistedNoteResult[] = [];

    for (const result of submitted) {
      const target = targetsById.get(result.timelineEventId);
      if (!target)
        throw new BadRequestException('A note result does not belong to the selected score range');
      if (submittedIds.has(target.id))
        throw new BadRequestException('A timeline event may only have one note result');
      if (result.eventIndex !== target.eventIndex)
        throw new BadRequestException('A note result has an invalid timeline event index');
      submittedIds.add(target.id);
      results.push(this.persistedResult(target, result.outcome, result));
    }

    for (const target of targetEvents) {
      if (!submittedIds.has(target.id))
        results.push(this.persistedResult(target, PracticeNoteOutcome.MISSING));
    }
    return results.sort((left, right) => left.eventIndex - right.eventIndex);
  }

  private persistedResult(
    target: TargetEvent,
    outcome: PracticeNoteOutcome,
    source?: CreatePracticeNoteResultDto,
  ): PersistedNoteResult {
    return {
      timelineEventId: target.id,
      eventIndex: target.eventIndex,
      measure: target.measure,
      beat: target.beat,
      startTick: target.startTick,
      expectedPitches: target.pitches,
      outcome,
      ...(source?.detectedMidi === undefined ? {} : { detectedMidi: source.detectedMidi }),
      ...(source?.correctedMidi === undefined ? {} : { correctedMidi: source.correctedMidi }),
      ...(source?.centsOffset === undefined ? {} : { centsOffset: source.centsOffset }),
      ...(source?.octaveShift === undefined ? {} : { octaveShift: source.octaveShift }),
      ...(source?.confidence === undefined ? {} : { confidence: source.confidence }),
      ...(source?.timingOffsetMs === undefined ? {} : { timingOffsetMs: source.timingOffsetMs }),
      ...(source?.bend === undefined ? {} : { bend: source.bend }),
    };
  }

  private countResults(results: PersistedNoteResult[], totalTargetEvents: number) {
    let correctCount = 0;
    let wrongPitchCount = 0;
    let missingCount = 0;
    let extraNoteCount = 0;
    for (const result of results) {
      if (result.outcome === PracticeNoteOutcome.CORRECT) correctCount += 1;
      if (result.outcome === PracticeNoteOutcome.WRONG_PITCH) wrongPitchCount += 1;
      if (result.outcome === PracticeNoteOutcome.MISSING) missingCount += 1;
      if (result.outcome === PracticeNoteOutcome.EXTRA_NOTE) {
        extraNoteCount += 1;
        missingCount += 1;
      }
    }
    return {
      correctCount,
      wrongPitchCount,
      missingCount,
      extraNoteCount,
      accuracyPercent: Math.round((correctCount / totalTargetEvents) * 100),
    };
  }

  private assertBpmInRange(bpm: number, configuration: Prisma.JsonValue) {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration))
      throw new BadRequestException('Exercise has no valid BPM range');
    const bpmRange = (configuration as { bpmRange?: unknown }).bpmRange;
    if (
      !Array.isArray(bpmRange) ||
      bpmRange.length !== 2 ||
      typeof bpmRange[0] !== 'number' ||
      typeof bpmRange[1] !== 'number' ||
      bpm < bpmRange[0] ||
      bpm > bpmRange[1]
    )
      throw new BadRequestException('BPM is outside the exercise range');
  }

  private async updateExerciseProgress(
    tx: Prisma.TransactionClient,
    userId: string,
    exerciseId: string,
    activeDurationMs: number,
    accuracyPercent: number,
    bpm: number,
    lastPracticedAt: Date,
  ) {
    const current = await tx.userExerciseProgress.findUnique({
      where: { userId_exerciseId: { userId, exerciseId } },
    });
    if (!current) {
      return tx.userExerciseProgress.create({
        data: {
          userId,
          exerciseId,
          completedPasses: 1,
          totalActiveMs: activeDurationMs,
          bestAccuracyPercent: accuracyPercent,
          bestBpm: accuracyPercent >= 90 ? bpm : 0,
          latestAccuracyPercent: accuracyPercent,
          lastPracticedAt,
        },
      });
    }
    return tx.userExerciseProgress.update({
      where: { id: current.id },
      data: {
        completedPasses: { increment: 1 },
        totalActiveMs: { increment: activeDurationMs },
        bestAccuracyPercent: Math.max(current.bestAccuracyPercent, accuracyPercent),
        bestBpm: accuracyPercent >= 90 ? Math.max(current.bestBpm, bpm) : current.bestBpm,
        latestAccuracyPercent: accuracyPercent,
        lastPracticedAt,
      },
    });
  }

  private isUniqueClientRunError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
