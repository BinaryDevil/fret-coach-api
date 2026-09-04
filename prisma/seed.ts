import { Difficulty, ExerciseType, PrismaClient, ScoreFormat } from '@prisma/client';
import { ScoreEventGeneratorService } from '../src/scores/score-event-generator.service';

const prisma = new PrismaClient();
const scoreEventGenerator = new ScoreEventGeneratorService();

type LaunchExercise = {
  slug: string;
  type: ExerciseType;
  difficulty: Difficulty;
  title: string;
  skillFocus: string;
  estimatedMinutes: number;
  targetBpm: number;
  bpmRange: [number, number];
  description: string;
  instructions: string;
  body: string;
};

const alphaTex = (title: string, bpm: number, body: string) =>
  `\\title "${title}"\n\\tempo ${bpm}\n.\n${body}`;

const launchExercises: LaunchExercise[] = [
  {
    slug: 'chromatic-1-2-3-4',
    type: ExerciseType.CHROMATIC,
    difficulty: Difficulty.BEGINNER,
    title: '1-2-3-4 Full-Range Spider',
    skillFocus: 'Finger independence',
    estimatedMinutes: 8,
    targetBpm: 60,
    bpmRange: [40, 140],
    description: 'A full-range chromatic spider from low E to high E and back.',
    instructions: 'Play evenly with one finger per fret. Raise the tempo only after a clean pass.',
    body:
      ':4 1.6 2.6 3.6 4.6 | 1.5 2.5 3.5 4.5 | 1.4 2.4 3.4 4.4 | 1.3 2.3 3.3 4.3 | 1.2 2.2 3.2 4.2 | 1.1 2.1 3.1 4.1 | 4.1 3.1 2.1 1.1 | 4.2 3.2 2.2 1.2 | 4.3 3.3 2.3 1.3 | 4.4 3.4 2.4 1.4 | 4.5 3.5 2.5 1.5 | 4.6 3.6 2.6 1.6 |',
  },
  {
    slug: 'chromatic-diagonal-crossing',
    type: ExerciseType.CHROMATIC,
    difficulty: Difficulty.BEGINNER,
    title: 'Diagonal String Crossing',
    skillFocus: 'Picking synchronization',
    estimatedMinutes: 6,
    targetBpm: 64,
    bpmRange: [40, 132],
    description: 'A diagonal chromatic path that changes strings on every note.',
    instructions: 'Use strict alternate picking. Keep both hands relaxed at every string change.',
    body: ':4 1.6 2.5 3.4 4.3 | 1.5 2.4 3.3 4.2 | 1.4 2.3 3.2 4.1 | 4.1 3.2 2.3 1.4 | 4.2 3.3 2.4 1.5 | 4.3 3.4 2.5 1.6 |',
  },
  {
    slug: 'finger-permutation-1-3-2-4',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: '1-3-2-4 Permutation',
    skillFocus: 'Finger independence',
    estimatedMinutes: 7,
    targetBpm: 56,
    bpmRange: [36, 124],
    description: 'A non-sequential four-finger pattern across all strings.',
    instructions: 'Leave fingers down when possible. Listen for equal volume from every finger.',
    body: ':4 1.6 3.6 2.6 4.6 | 1.5 3.5 2.5 4.5 | 1.4 3.4 2.4 4.4 | 1.3 3.3 2.3 4.3 | 1.2 3.2 2.2 4.2 | 1.1 3.1 2.1 4.1 |',
  },
  {
    slug: 'finger-permutation-1-4-2-3',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: '1-4-2-3 Stretch',
    skillFocus: 'Left-hand reach',
    estimatedMinutes: 7,
    targetBpm: 52,
    bpmRange: [32, 116],
    description: 'A wider-finger permutation for controlled reach.',
    instructions: 'Use the smallest possible stretch. Stop if the hand starts to tense.',
    body: ':4 1.6 4.6 2.6 3.6 | 1.5 4.5 2.5 3.5 | 1.4 4.4 2.4 3.4 | 1.3 4.3 2.3 3.3 | 1.2 4.2 2.2 3.2 | 1.1 4.1 2.1 3.1 |',
  },
  {
    slug: 'alternate-picking-single-string',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Alternate Picking Pulse',
    skillFocus: 'Picking control',
    estimatedMinutes: 6,
    targetBpm: 72,
    bpmRange: [44, 168],
    description: 'A repeating single-string line for even alternate picking.',
    instructions: 'Alternate down-up continuously. Keep pick motion short and consistent.',
    body:
      ':8 1.6 {sd} 2.6 {su} 3.6 {sd} 4.6 {su} 4.6 {sd} 3.6 {su} 2.6 {sd} 1.6 {su} | 1.5 {sd} 2.5 {su} 3.5 {sd} 4.5 {su} 4.5 {sd} 3.5 {su} 2.5 {sd} 1.5 {su} | 1.4 {sd} 2.4 {su} 3.4 {sd} 4.4 {su} 4.4 {sd} 3.4 {su} 2.4 {sd} 1.4 {su} |',
  },
  {
    slug: 'inside-outside-picking',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Inside & Outside Picking',
    skillFocus: 'String crossing',
    estimatedMinutes: 7,
    targetBpm: 68,
    bpmRange: [40, 150],
    description: 'Two-string groups that expose inside and outside pick strokes.',
    instructions: 'Keep the pulse steady through every crossing; do not rush the second string.',
    body: ':8 1.6 3.5 2.6 4.5 3.6 1.5 4.6 2.5 | 1.5 3.4 2.5 4.4 3.5 1.4 4.5 2.4 | 1.4 3.3 2.4 4.3 3.4 1.3 4.4 2.3 |',
  },
  {
    slug: 'legato-ascending-ladder',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Ascending Legato Ladder',
    skillFocus: 'Hammer-on control',
    estimatedMinutes: 6,
    targetBpm: 58,
    bpmRange: [36, 128],
    description: 'An ascending two-note-per-string line for clean hammer-ons.',
    instructions: 'Pick the first note on each string, then make the second note speak clearly.',
    body: ':8 1.6 3.6 1.5 3.5 1.4 3.4 1.3 3.3 | 1.2 3.2 1.1 3.1 3.1 1.1 3.2 1.2 | 3.3 1.3 3.4 1.4 3.5 1.5 3.6 1.6 |',
  },
  {
    slug: 'legato-descending-ladder',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Descending Legato Ladder',
    skillFocus: 'Pull-off control',
    estimatedMinutes: 6,
    targetBpm: 58,
    bpmRange: [36, 128],
    description: 'A descending two-note-per-string line for clean pull-offs.',
    instructions: 'Pick the first note on each string, then pull off without pulling the next note sharp.',
    body: ':8 3.1 1.1 3.2 1.2 3.3 1.3 3.4 1.4 | 3.5 1.5 3.6 1.6 1.6 3.6 1.5 3.5 | 1.4 3.4 1.3 3.3 1.2 3.2 1.1 3.1 |',
  },
  {
    slug: 'c-major-two-octaves',
    type: ExerciseType.SCALE,
    difficulty: Difficulty.BEGINNER,
    title: 'C Major Two Octaves',
    skillFocus: 'Scale fluency',
    estimatedMinutes: 8,
    targetBpm: 66,
    bpmRange: [40, 156],
    description: 'A compact C major route through two octaves.',
    instructions: 'Say note names quietly as you play. Use alternate picking and land cleanly on the octave.',
    body: ':8 3.5 0.4 2.4 3.4 0.3 2.3 4.3 0.2 | 1.2 3.2 0.1 1.1 3.1 1.1 0.1 3.2 | 1.2 0.2 4.3 2.3 0.3 3.4 2.4 0.4 | 3.5 |',
  },
  {
    slug: 'a-minor-pentatonic-position-one',
    type: ExerciseType.SCALE,
    difficulty: Difficulty.BEGINNER,
    title: 'A Minor Pentatonic Position One',
    skillFocus: 'Pentatonic navigation',
    estimatedMinutes: 7,
    targetBpm: 70,
    bpmRange: [44, 168],
    description: 'The foundational A minor pentatonic box, ascending and descending.',
    instructions: 'Keep each string pair even. Focus on muting unused strings.',
    body: ':8 0.6 3.6 0.5 2.5 0.4 2.4 0.3 2.3 | 0.2 3.2 0.1 3.1 3.1 0.1 3.2 0.2 | 2.3 0.3 2.4 0.4 2.5 0.5 3.6 0.6 |',
  },
  {
    slug: 'e-minor-three-notes-per-string',
    type: ExerciseType.SCALE,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'E Minor Three Notes per String',
    skillFocus: 'Position shifting',
    estimatedMinutes: 8,
    targetBpm: 64,
    bpmRange: [40, 150],
    description: 'A three-notes-per-string minor scale fragment with controlled shifts.',
    instructions: 'Shift only when the previous note is stable. Keep the pick depth shallow.',
    body: ':8 0.6 2.6 3.6 0.5 2.5 3.5 0.4 2.4 | 4.4 0.3 2.3 4.3 0.2 1.2 3.2 0.1 | 1.1 3.1 1.1 0.1 3.2 1.2 0.2 4.3 | 2.3 0.3 4.4 2.4 0.4 3.5 2.5 0.5 | 3.6 2.6 0.6 |',
  },
  {
    slug: 'open-chord-triad-switches',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Open Triad Switches',
    skillFocus: 'Clean transitions',
    estimatedMinutes: 8,
    targetBpm: 56,
    bpmRange: [36, 120],
    description: 'Simple three-note chord shapes for calm, deliberate changes.',
    instructions: 'Form each shape before striking it. Let every note ring without rushing the next change.',
    body: ':4 (0.4 1.3 0.2) (2.5 2.4 1.3) (0.4 0.3 0.2) (2.4 1.3 0.2) | (0.4 1.3 0.2) (2.5 2.4 1.3) (0.4 0.3 0.2) (2.4 1.3 0.2) |',
  },
  {
    slug: 'power-chord-shift-grid',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Power Chord Shift Grid',
    skillFocus: 'Chord mobility',
    estimatedMinutes: 6,
    targetBpm: 72,
    bpmRange: [44, 160],
    description: 'Movable two-note power chords across a simple fret grid.',
    instructions: 'Use one consistent shape. Release pressure while moving, then fret together on the beat.',
    body: ':4 (3.6 5.5) (5.6 7.5) (7.6 9.5) (5.6 7.5) | (3.5 5.4) (5.5 7.4) (7.5 9.4) (5.5 7.4) |',
  },
  {
    slug: 'muted-eighth-note-groove',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Muted Eighth-Note Groove',
    skillFocus: 'Rhythmic consistency',
    estimatedMinutes: 5,
    targetBpm: 80,
    bpmRange: [50, 180],
    description: 'A steady one-note groove for rhythm and pick consistency.',
    instructions: 'Use light palm muting and count eighth notes out loud.',
    body:
      ':8 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} | 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} 0.6{pm} |',
  },
  {
    slug: 'accented-sixteenth-grid',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Accented Sixteenth Grid',
    skillFocus: 'Subdivision control',
    estimatedMinutes: 6,
    targetBpm: 68,
    bpmRange: [40, 150],
    description: 'A repeated note grid for clean sixteenth-note subdivisions.',
    instructions: 'Accent beat one mentally while keeping every note the same length.',
    body: ':16 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 | 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 |',
  },
  {
    slug: 'tremolo-picking-control',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Tremolo Picking Control',
    skillFocus: 'Tremolo picking',
    estimatedMinutes: 6,
    targetBpm: 64,
    bpmRange: [40, 132],
    description: 'Sustained notes marked for sixteenth-note tremolo picking.',
    instructions: 'Keep the tremolo motion relaxed and even. Do not let the final notes of each sustain rush.',
    body: ':2 7.3 {tp 2} 7.3 {tp 2} | 8.3 {tp 2} 8.3 {tp 2} |',
  },
  {
    slug: 'triad-arpeggio-sweep',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Triad Arpeggio Sweep',
    skillFocus: 'Arpeggio articulation',
    estimatedMinutes: 7,
    targetBpm: 56,
    bpmRange: [32, 116],
    description: 'Three-note triads with explicit upward and downward arpeggio directions.',
    instructions: 'Let the pick travel through the strings in one smooth motion; mute each chord before the next.',
    body: ':2 (3.6 5.5 5.4) {au} (5.4 5.5 3.6) {ad} | (5.6 7.5 7.4) {au} (7.4 7.5 5.6) {ad} |',
  },
  {
    slug: 'whole-step-bend-targets',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Whole-Step Bend Targets',
    skillFocus: 'Bend intonation',
    estimatedMinutes: 6,
    targetBpm: 52,
    bpmRange: [32, 104],
    description: 'Reference notes and target frets for future bend-pitch feedback.',
    instructions: 'Play the target note, then match it from two frets below with a controlled bend.',
    body:
      ':4 7.2 5.2{b (0 8)} 7.2 5.2{b (0 8)} | 8.2 6.2{b (0 8)} 8.2 6.2{b (0 8)} | 10.2 8.2{b (0 8)} 10.2 8.2{b (0 8)} | 12.2 10.2{b (0 8)} 12.2 10.2{b (0 8)} |',
  },
  {
    slug: 'half-step-bends',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.BEGINNER,
    title: 'Half-Step Bend Control',
    skillFocus: 'Bend intonation',
    estimatedMinutes: 6,
    targetBpm: 60,
    bpmRange: [36, 108],
    description: 'Raise each note exactly one semitone, then hold the target pitch.',
    instructions:
      'Bend smoothly from the fretted note to the target. Listen for the target before increasing tempo.',
    body: ':2 8.3 { b (0 4) } r | 7.2 { b (0 4) } r |',
  },
  {
    slug: 'whole-step-bends',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Whole-Step Bend Control',
    skillFocus: 'Bend intonation',
    estimatedMinutes: 6,
    targetBpm: 55,
    bpmRange: [32, 100],
    description: 'Build controlled whole-step bends and arrive at pitch without overshooting.',
    instructions:
      'Use a relaxed wrist turn. Reach the target pitch deliberately and avoid pulling it sharp.',
    body: ':2 7.3 { b (0 8) } r | 8.2 { b (0 8) } r |',
  },
  {
    slug: 'bend-and-release',
    type: ExerciseType.FINGER_DEXTERITY,
    difficulty: Difficulty.INTERMEDIATE,
    title: 'Bend & Release Control',
    skillFocus: 'Bend release timing',
    estimatedMinutes: 7,
    targetBpm: 50,
    bpmRange: [30, 92],
    description: 'Reach the target cleanly, then release back to the fretted pitch in time.',
    instructions:
      'Keep the fretting finger planted. Hold the target briefly, then release smoothly to the original pitch.',
    body: ':2 8.3 { b (0 8 8 0) } r | 8.2 { b (0 8 8 0) } r |',
  },
];

async function seedExercise(definition: LaunchExercise, libraryOrder: number) {
  const configuration = {
    targetBpm: definition.targetBpm,
    bpmRange: definition.bpmRange,
    tags: [definition.skillFocus.toLowerCase(), definition.type.toLowerCase()],
  };
  const exerciseData = {
    type: definition.type,
    difficulty: definition.difficulty,
    title: definition.title,
    description: definition.description,
    instructions: definition.instructions,
    skillFocus: definition.skillFocus,
    estimatedMinutes: definition.estimatedMinutes,
    libraryOrder,
    configuration,
    isPublished: true,
  };
  const exercise = await prisma.exercise.upsert({
    where: { slug: definition.slug },
    update: exerciseData,
    create: { slug: definition.slug, ...exerciseData },
  });
  const content = alphaTex(definition.title, definition.targetBpm, definition.body);
  const scoreInput = {
    format: ScoreFormat.ALPHA_TEX,
    content,
    defaultBpm: definition.targetBpm,
    timeSignature: '4/4',
  };
  const timeline = await scoreEventGenerator.generate(scoreInput);
  await prisma.exerciseScore.upsert({
    where: { exerciseId: exercise.id },
    update: {
      ...scoreInput,
      totalMeasures: timeline.totalMeasures,
      eventVersion: timeline.version,
      eventSourceHash: scoreEventGenerator.sourceHash(scoreInput),
      timeline,
      eventGenerationError: null,
      eventGeneratedAt: new Date(),
    },
    create: {
      exerciseId: exercise.id,
      ...scoreInput,
      totalMeasures: timeline.totalMeasures,
      eventVersion: timeline.version,
      eventSourceHash: scoreEventGenerator.sourceHash(scoreInput),
      timeline,
      eventGeneratedAt: new Date(),
    },
  });
  await prisma.loopRegion.upsert({
    where: {
      exerciseId_startMeasure_endMeasure: {
        exerciseId: exercise.id,
        startMeasure: 1,
        endMeasure: timeline.totalMeasures,
      },
    },
    update: { title: 'Full Loop', defaultBpm: definition.targetBpm },
    create: {
      exerciseId: exercise.id,
      title: 'Full Loop',
      startMeasure: 1,
      endMeasure: timeline.totalMeasures,
      defaultBpm: definition.targetBpm,
    },
  });
}

async function main() {
  for (const [index, exercise] of launchExercises.entries()) await seedExercise(exercise, index + 1);
  console.log(`Seeded ${launchExercises.length} original foundation exercises.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
