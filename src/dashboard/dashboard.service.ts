import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const weekStart = this.weekStartUtc(new Date());
    const [progress, weeklyAttempts, latestAttempt, recommendations] = await Promise.all([
      this.prisma.userProgress.findUnique({ where: { userId } }),
      this.prisma.practiceAttempt.aggregate({
        where: { userId, completedAt: { gte: weekStart } },
        _avg: { accuracyPercent: true },
        _sum: { activeDurationMs: true },
      }),
      this.prisma.practiceAttempt.findFirst({
        where: { userId },
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        select: {
          bpm: true,
          accuracyPercent: true,
          exercise: { select: this.exerciseCardSelect },
        },
      }),
      this.prisma.exercise.findMany({
        where: { isPublished: true },
        select: this.exerciseCardSelect,
        orderBy: { libraryOrder: 'asc' },
        take: 3,
      }),
    ]);

    const averageAccuracy = Math.round(weeklyAttempts._avg.accuracyPercent ?? 0);
    const nextPractice = latestAttempt
      ? { ...latestAttempt.exercise, targetBpm: latestAttempt.bpm }
      : recommendations[0]
        ? { ...recommendations[0], targetBpm: this.targetBpm(recommendations[0].configuration) }
        : null;

    return {
      nextPractice,
      stats: {
        currentDayStreak: progress?.currentDayStreak ?? 0,
        averageAccuracyPercent: averageAccuracy,
        playedThisWeekMs: weeklyAttempts._sum.activeDurationMs ?? 0,
      },
      coachNote: this.coachNote(latestAttempt?.accuracyPercent, nextPractice?.targetBpm),
      recommendations: recommendations.map((exercise, index) => ({
        rank: index + 1,
        ...exercise,
        targetBpm: this.targetBpm(exercise.configuration),
      })),
    };
  }

  private readonly exerciseCardSelect = {
    id: true,
    slug: true,
    type: true,
    difficulty: true,
    title: true,
    skillFocus: true,
    estimatedMinutes: true,
    configuration: true,
  } as const;

  private targetBpm(configuration: unknown): number | null {
    if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration))
      return null;
    const targetBpm = (configuration as { targetBpm?: unknown }).targetBpm;
    return typeof targetBpm === 'number' ? targetBpm : null;
  }

  private coachNote(accuracyPercent?: number, targetBpm?: number | null) {
    if (accuracyPercent === undefined)
      return 'Start with a clean, controlled pass and raise the tempo only when it feels relaxed.';
    if (accuracyPercent >= 90 && targetBpm)
      return `Strong last pass. Try ${targetBpm + 4} BPM when your timing still feels even.`;
    if (accuracyPercent >= 75)
      return 'Your accuracy is building. Repeat at the same BPM and aim for cleaner note changes.';
    return 'Slow the tempo slightly and prioritize even timing before adding speed.';
  }

  private weekStartUtc(now: Date) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const offsetFromMonday = (dayStart.getUTCDay() + 6) % 7;
    dayStart.setUTCDate(dayStart.getUTCDate() - offsetFromMonday);
    return dayStart;
  }
}
