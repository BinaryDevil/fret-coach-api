import { Difficulty, ExerciseType, PrismaClient, ScoreFormat } from '@prisma/client';
const prisma = new PrismaClient();
const alphaTex = '\\. tempo 60\\n. 4.4\\n:8 0.1 1.1 2.1 3.1 | 4.1 3.1 2.1 1.1';
async function main() {
  const exercise = await prisma.exercise.upsert({ where: { slug: 'chromatic-1-2-3-4' }, update: { title: '1-2-3-4 爬格子', configuration: { targetBpm: 60, bpmRange: [40, 140] } }, create: { slug: 'chromatic-1-2-3-4', type: ExerciseType.CHROMATIC, difficulty: Difficulty.BEGINNER, title: '1-2-3-4 爬格子', description: '建立左手独立性与拨弦同步。', instructions: '从 60 BPM 开始，每次干净完成后增加 5 BPM。', configuration: { targetBpm: 60, bpmRange: [40, 140] } } });
  await prisma.exerciseScore.upsert({ where: { exerciseId: exercise.id }, update: { format: ScoreFormat.ALPHA_TEX, content: alphaTex, defaultBpm: 60, totalMeasures: 2 }, create: { exerciseId: exercise.id, format: ScoreFormat.ALPHA_TEX, content: alphaTex, defaultBpm: 60, totalMeasures: 2 } });
  await prisma.loopRegion.upsert({ where: { exerciseId_startMeasure_endMeasure: { exerciseId: exercise.id, startMeasure: 1, endMeasure: 2 } }, update: { title: '完整循环', defaultBpm: 60 }, create: { exerciseId: exercise.id, title: '完整循环', startMeasure: 1, endMeasure: 2, defaultBpm: 60 } });
}
main().then(() => prisma.$disconnect()).catch(async (error: unknown) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
