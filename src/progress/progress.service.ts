import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}
  async recordSession(userId: string, practiceSeconds: number) {
    const current = await this.prisma.userProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const today = this.utcDay(new Date());
    const previous = current.lastPracticedOn ? this.utcDay(current.lastPracticedOn) : undefined;
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const sameDay = previous?.getTime() === today.getTime();
    const continues = previous?.getTime() === yesterday.getTime();
    const streak = sameDay
      ? current.currentDayStreak
      : continues
        ? current.currentDayStreak + 1
        : 1;
    return this.prisma.userProgress.update({
      where: { userId },
      data: {
        totalSessions: { increment: 1 },
        totalPracticeSeconds: { increment: practiceSeconds },
        currentDayStreak: streak,
        longestDayStreak: Math.max(current.longestDayStreak, streak),
        lastPracticedOn: today,
      },
    });
  }
  async summary(userId: string) {
    const progress = await this.prisma.userProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return progress;
  }
  private utcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
