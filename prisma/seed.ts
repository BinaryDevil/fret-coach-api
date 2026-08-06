import { Difficulty, ExerciseType, PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const exercises = [
    { slug: 'chromatic-1-2-3-4', type: ExerciseType.CHROMATIC, difficulty: Difficulty.BEGINNER, title: '1-2-3-4 爬格子', description: '在每根弦上依次使用四根手指，建立独立性与同步性。', instructions: '从 60 BPM 开始，使用交替拨弦；每次干净完成后增加 5 BPM。', configuration: { targetBpm: 60, bpmRange: [40, 140], fingering: [1, 2, 3, 4], strings: [6, 5, 4, 3, 2, 1] } },
    { slug: 'c-major-one-octave', type: ExerciseType.SCALE, difficulty: Difficulty.BEGINNER, title: 'C 大调一八度音阶', description: '练习 C 大调音阶的音准、节奏与换把。', instructions: '四分音符开始，保持每个音均匀且清晰。', configuration: { key: 'C', scale: 'major', octaves: 1, targetBpm: 70, notesPerBeat: 1 } },
    { slug: 'spider-finger-independence', type: ExerciseType.FINGER_DEXTERITY, difficulty: Difficulty.INTERMEDIATE, title: 'Spider 手指独立性', description: '交叉指法训练，提升左手手指机动性。', instructions: '避免手指离开指板过高，慢速并保持均匀。', configuration: { pattern: [1, 3, 2, 4], targetBpm: 55, notesPerBeat: 2 } },
  ];
  for (const exercise of exercises) await prisma.exercise.upsert({ where: { slug: exercise.slug }, update: exercise, create: exercise });
}
main().then(() => prisma.$disconnect()).catch(async (error: unknown) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
