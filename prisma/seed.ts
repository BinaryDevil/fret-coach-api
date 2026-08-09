import { Difficulty, ExerciseType, PrismaClient, ScoreFormat } from '@prisma/client';
const prisma = new PrismaClient();
const alphaTex =
  '\\title "1-2-3-4 Full-Range Spider"\n\\tempo 60\n.\n:4 1.6 2.6 3.6 4.6 | 1.5 2.5 3.5 4.5 | 1.4 2.4 3.4 4.4 | 1.3 2.3 3.3 4.3 | 1.2 2.2 3.2 4.2 | 1.1 2.1 3.1 4.1 | 4.1 3.1 2.1 1.1 | 4.2 3.2 2.2 1.2 | 4.3 3.3 2.3 1.3 | 4.4 3.4 2.4 1.4 | 4.5 3.5 2.5 1.5 | 4.6 3.6 2.6 1.6 |';
async function main() {
  const exercise = await prisma.exercise.upsert({
    where: { slug: 'chromatic-1-2-3-4' },
    update: {
      title: '1-2-3-4 Full-Range Spider',
      description:
        'A full-range Spider exercise from the low E string to the high E string and back, training left-hand independence and picking synchronization.',
      instructions:
        'Play 1-2-3-4 from the low E string to the high E string, then return to the low E string. Start at 60 BPM and increase by 5 BPM after each clean repetition.',
      configuration: { targetBpm: 60, bpmRange: [40, 140] },
    },
    create: {
      slug: 'chromatic-1-2-3-4',
      type: ExerciseType.CHROMATIC,
      difficulty: Difficulty.BEGINNER,
      title: '1-2-3-4 Full-Range Spider',
      description:
        'A full-range Spider exercise from the low E string to the high E string and back, training left-hand independence and picking synchronization.',
      instructions:
        'Play 1-2-3-4 from the low E string to the high E string, then return to the low E string. Start at 60 BPM and increase by 5 BPM after each clean repetition.',
      configuration: { targetBpm: 60, bpmRange: [40, 140] },
    },
  });
  await prisma.exerciseScore.upsert({
    where: { exerciseId: exercise.id },
    update: { format: ScoreFormat.ALPHA_TEX, content: alphaTex, defaultBpm: 60, totalMeasures: 12 },
    create: {
      exerciseId: exercise.id,
      format: ScoreFormat.ALPHA_TEX,
      content: alphaTex,
      defaultBpm: 60,
      totalMeasures: 12,
    },
  });
  const existingFullLoop = await prisma.loopRegion.findFirst({
    where: { exerciseId: exercise.id, startMeasure: 1, endMeasure: { in: [2, 12] } },
    select: { id: true },
  });
  if (existingFullLoop)
    await prisma.loopRegion.update({
      where: { id: existingFullLoop.id },
      data: { title: 'Full Loop', startMeasure: 1, endMeasure: 12, defaultBpm: 60 },
    });
  else
    await prisma.loopRegion.create({
      data: {
        exerciseId: exercise.id,
        title: 'Full Loop',
        startMeasure: 1,
        endMeasure: 12,
        defaultBpm: 60,
      },
    });
}
main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
