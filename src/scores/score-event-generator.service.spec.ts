import { ScoreFormat } from '@prisma/client';
import { ScoreEventGeneratorService, TICKS_PER_QUARTER } from './score-event-generator.service';

describe('ScoreEventGeneratorService', () => {
  const service = new ScoreEventGeneratorService();

  it('generates a musical tick timeline from the Spider AlphaTex score', async () => {
    const timeline = await service.generate({
      format: ScoreFormat.ALPHA_TEX,
      content: '\\tempo 60\n.\n:4 1.6 2.6 3.6 4.6 | 1.5 2.5 3.5 4.5 |',
      defaultBpm: 60,
      timeSignature: '4/4',
    });

    expect(timeline.events).toHaveLength(8);
    expect(timeline.events.slice(0, 3)).toMatchObject([
      {
        id: 'm1-b1-t0-v0-e0',
        measure: 1,
        beat: 1,
        startTick: 0,
        durationTicks: 960,
        pitches: [41],
        notes: [{ midi: 41, string: 1, fret: 1 }],
      },
      { measure: 1, beat: 2, startTick: 960, durationTicks: 960, pitches: [42] },
      { measure: 1, beat: 3, startTick: 1920, durationTicks: 960, pitches: [43] },
    ]);
    expect(timeline.totalTicks).toBe(8 * TICKS_PER_QUARTER);
    expect(timeline.tracks).toEqual([
      expect.objectContaining({
        id: 't0',
        name: 'Track 1',
        instrument: 'GUITAR',
        tuning: [64, 59, 55, 50, 45, 40],
      }),
    ]);
    expect(timeline.events[0]).toMatchObject({ trackId: 't0' });
  });

  it('keeps chord pitches together in one event and preserves rests', async () => {
    const timeline = await service.generate({
      format: ScoreFormat.ALPHA_TEX,
      content: '.\n:4 (0.6 2.5 2.4) r |',
      defaultBpm: 90,
      timeSignature: '4/4',
    });

    expect(timeline.events[0]).toMatchObject({
      isRest: false,
      durationTicks: 960,
      pitches: [40, 47, 52],
    });
    expect(timeline.events[1]).toMatchObject({
      isRest: true,
      pitches: [],
      notes: [],
      startTick: 960,
    });
  });

  it('calculates duration ticks for different rhythmic values', async () => {
    const timeline = await service.generate({
      format: ScoreFormat.ALPHA_TEX,
      content: '.\n:8 1.6 2.6 3.6 4.6 |',
      defaultBpm: 60,
      timeSignature: '4/4',
    });

    expect(timeline.events.map((event) => event.durationTicks)).toEqual([480, 480, 480, 480]);
    expect(timeline.events.map((event) => event.startTick)).toEqual([0, 480, 960, 1440]);
  });

  it('requires regeneration when score source changes', () => {
    const original = {
      format: ScoreFormat.ALPHA_TEX,
      content: '.\n:4 1.6 |',
      defaultBpm: 60,
      timeSignature: '4/4',
    };
    const changed = { ...original, content: '.\n:4 2.6 |' };
    expect(service.shouldGenerate(original, 2, service.sourceHash(original))).toBe(false);
    expect(service.shouldGenerate(changed, 1, service.sourceHash(original))).toBe(true);
  });

  it('preserves structured beat and note effects from AlphaTex source', async () => {
    const timeline = await service.generate({
      format: ScoreFormat.ALPHA_TEX,
      content: '.\n:4 1.6 {sd} 2.6 {su} 3.6{pm} 5.6{b (0 8)} |',
      defaultBpm: 80,
      timeSignature: '4/4',
    });

    expect(timeline.events[0]).toMatchObject({
      effects: [{ type: 'PICK_STROKE', direction: 'DOWN' }],
      techniques: ['PICK_STROKE'],
    });
    expect(timeline.events[1]).toMatchObject({
      effects: [{ type: 'PICK_STROKE', direction: 'UP' }],
    });
    expect(timeline.events[2]).toMatchObject({
      techniques: ['PALM_MUTE'],
      notes: [
        expect.objectContaining({
          effects: [{ type: 'PALM_MUTE' }],
        }),
      ],
    });
    expect(timeline.events[3].notes[0].effects).toEqual([
      expect.objectContaining({
        type: 'BEND',
        bendType: 'BEND',
        targetSemitones: 2,
        points: [
          { offsetTicks: 0, semitones: 0 },
          { offsetTicks: 960, semitones: 2 },
        ],
      }),
    ]);
  });

  it('preserves an arpeggio direction for a chord', async () => {
    const timeline = await service.generate({
      format: ScoreFormat.ALPHA_TEX,
      content: '.\n:4 (3.6 5.5) {au} |',
      defaultBpm: 72,
      timeSignature: '4/4',
    });

    expect(timeline.events[0]).toMatchObject({
      pitches: [43, 50],
      effects: [{ type: 'ARPEGGIO', direction: 'UP' }],
    });
  });
});
