import { Injectable } from '@nestjs/common';
import { ScoreFormat } from '@prisma/client';
import * as alphaTab from '@coderline/alphatab';
import { createHash } from 'node:crypto';

/**
 * Version 2 adds canonical track metadata and structured notation effects.
 * The raw score remains the rendering source; this model is the stable API and
 * practice-engine representation.
 */
export const SCORE_EVENT_VERSION = 2;
export const TICKS_PER_QUARTER = 960;

/** Stable client-facing identifier for the generated scoring timeline. */
export const scoreRevision = (eventVersion: number, eventSourceHash?: string | null): string =>
  `v${eventVersion}:${eventSourceHash ?? 'unprocessed'}`;

/**
 * A score event in musical ticks. Convert to the active playback timeline with:
 * milliseconds = (startTick / ticksPerQuarter) * (60_000 / currentBpm).
 */
export type ScoreTrack = {
  /** Stable within a score revision. Do not use alphaTab's array index as an API identity. */
  id: string;
  index: number;
  name: string;
  instrument: 'GUITAR' | 'BASS' | 'OTHER';
  tuning: number[];
  capo?: number;
};

export type ScoreEffect =
  | { type: 'PICK_STROKE'; direction: 'UP' | 'DOWN' }
  | { type: 'TREMOLO_PICKING'; marks: number; style: 'DEFAULT' | 'BUZZ_ROLL' }
  | { type: 'ARPEGGIO'; direction: 'UP' | 'DOWN' }
  | { type: 'VIBRATO' };

export type ScoreNoteEffect =
  | {
      type: 'BEND';
      bendType:
        | 'CUSTOM'
        | 'BEND'
        | 'RELEASE'
        | 'BEND_RELEASE'
        | 'HOLD'
        | 'PREBEND'
        | 'PREBEND_BEND'
        | 'PREBEND_RELEASE';
      style: 'DEFAULT' | 'GRADUAL' | 'FAST';
      points: Array<{ offsetTicks: number; semitones: number }>;
      targetSemitones?: number;
    }
  | { type: 'HAMMER_PULL'; destinationEventId?: string }
  | {
      type: 'SLIDE';
      direction: 'IN_FROM_BELOW' | 'IN_FROM_ABOVE' | 'SHIFT' | 'LEGATO' | 'OUT_UP' | 'OUT_DOWN';
      destinationEventId?: string;
    }
  | { type: 'PALM_MUTE' }
  | { type: 'LET_RING' }
  | { type: 'VIBRATO' }
  | { type: 'HARMONIC'; kind: 'NATURAL' | 'ARTIFICIAL' | 'PINCH' | 'TAP' | 'SEMI' | 'FEEDBACK' }
  | { type: 'DEAD_NOTE' }
  | { type: 'GHOST_NOTE' }
  | { type: 'STACCATO' };

export type ScoreNote = {
  midi: number;
  string?: number;
  fret?: number;
  effects?: ScoreNoteEffect[];
};

export type ScoreNoteEvent = {
  id: string;
  measure: number;
  beat: number;
  startTick: number;
  durationTicks: number;
  ticksPerQuarter: number;
  /** @deprecated Use trackId. Retained for version-1 API consumers. */
  trackIndex: number;
  trackId: string;
  voiceIndex: number;
  pitches: number[];
  notes: ScoreNote[];
  isRest: boolean;
  /** Compact, backwards-compatible effect names for simple clients. */
  techniques?: string[];
  /** Structured beat-level notation effects. */
  effects?: ScoreEffect[];
};

/** Versioned, BPM-independent scoring data returned on exercise detail responses. */
export type ScoreTimeline = {
  version: number;
  ticksPerQuarter: typeof TICKS_PER_QUARTER;
  totalTicks: number;
  totalMeasures: number;
  timeSignature: string;
  defaultBpm: number;
  tracks: ScoreTrack[];
  events: ScoreNoteEvent[];
};

export type GenerateScoreEventsInput = {
  format: ScoreFormat;
  content?: string | null;
  storageKey?: string | null;
  defaultBpm: number;
  timeSignature: string;
};

export class UnsupportedScoreEventGenerationError extends Error {
  constructor(format: ScoreFormat) {
    super(
      `Generating score events for ${format} is not supported until source-file loading is available`,
    );
    this.name = 'UnsupportedScoreEventGenerationError';
  }
}

@Injectable()
export class ScoreEventGeneratorService {
  sourceHash(input: GenerateScoreEventsInput): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          format: input.format,
          content: input.content ?? null,
          storageKey: input.storageKey ?? null,
          defaultBpm: input.defaultBpm,
          timeSignature: input.timeSignature,
        }),
      )
      .digest('hex');
  }

  shouldGenerate(
    input: GenerateScoreEventsInput,
    eventVersion: number,
    eventSourceHash?: string | null,
  ): boolean {
    return eventVersion !== SCORE_EVENT_VERSION || eventSourceHash !== this.sourceHash(input);
  }

  generate(input: GenerateScoreEventsInput): Promise<ScoreTimeline> {
    return Promise.resolve().then(() => this.generateSynchronously(input));
  }

  private generateSynchronously(input: GenerateScoreEventsInput): ScoreTimeline {
    if (input.format !== ScoreFormat.ALPHA_TEX)
      throw new UnsupportedScoreEventGenerationError(input.format);
    if (!input.content)
      throw new Error('ALPHA_TEX score content is required to generate score events');

    const importer = new alphaTab.importer.AlphaTexImporter();
    importer.initFromString(input.content, new alphaTab.Settings());
    const score = importer.readScore();
    return this.generateFromParsedScore(score, input);
  }

  /**
   * Converts an already-parsed alphaTab score into FretCoach's canonical API model.
   * Import adapters for Guitar Pro and MusicXML will reuse this method.
   */
  generateFromParsedScore(
    score: alphaTab.model.Score,
    input: Pick<GenerateScoreEventsInput, 'defaultBpm' | 'timeSignature'>,
  ): ScoreTimeline {
    const events: ScoreNoteEvent[] = [];
    const tracks: ScoreTrack[] = score.tracks.map((track, index) => {
      const staff = track.staves[0];
      const tuning = staff?.tuning ?? [];
      return {
        id: `t${index}`,
        index,
        name: track.name?.trim() || `Track ${index + 1}`,
        instrument: this.instrumentFor(track, tuning),
        tuning,
        ...(staff?.capo ? { capo: staff.capo } : {}),
      };
    });
    const eventIdByNote = new Map<object, string>();
    const sourceNoteByResultNote = new Map<ScoreNote, alphaTab.model.Note>();

    for (const [trackIndex, track] of score.tracks.entries()) {
      for (const staff of track.staves) {
        for (const [measureOffset, bar] of staff.bars.entries()) {
          const masterBar = score.masterBars[measureOffset];
          if (!masterBar) continue;
          const measure = measureOffset + 1;
          const beatTicks = (TICKS_PER_QUARTER * 4) / masterBar.timeSignatureDenominator;
          for (const [voiceIndex, voice] of bar.voices.entries()) {
            for (const [eventOffset, beat] of voice.beats.entries()) {
              const startTick = masterBar.start + beat.displayStart;
              const notes = beat.notes.map((note) => {
                const result: ScoreNote = {
                  midi: note.realValue,
                  ...(note.string > 0 ? { string: note.string } : {}),
                  ...(note.fret >= 0 ? { fret: note.fret } : {}),
                };
                sourceNoteByResultNote.set(result, note);
                return result;
              });
              const isRest = notes.length === 0;
              const id = `m${measure}-b${Math.floor(beat.displayStart / beatTicks) + 1}-t${trackIndex}-v${voiceIndex}-e${eventOffset}`;
              for (const note of beat.notes) eventIdByNote.set(note, id);
              const effects = this.beatEffects(beat);
              events.push({
                id,
                measure,
                beat: Math.floor(beat.displayStart / beatTicks) + 1,
                startTick,
                durationTicks: beat.displayDuration,
                ticksPerQuarter: TICKS_PER_QUARTER,
                trackIndex,
                trackId: `t${trackIndex}`,
                voiceIndex,
                pitches: notes.map((note) => note.midi),
                notes,
                isRest,
                ...(effects.length ? { effects } : {}),
                ...(effects.length ? { techniques: effects.map((effect) => effect.type) } : {}),
              });
            }
          }
        }
      }
    }

    for (const event of events) {
      for (const note of event.notes) {
        const sourceNote = sourceNoteByResultNote.get(note);
        if (!sourceNote) continue;
        const effects = this.noteEffects(sourceNote, event.durationTicks, eventIdByNote);
        if (effects.length) {
          note.effects = effects;
          event.techniques = [
            ...new Set([...(event.techniques ?? []), ...effects.map((effect) => effect.type)]),
          ];
        }
      }
    }

    const totalTicks = score.masterBars.reduce(
      (total, masterBar) => Math.max(total, masterBar.start + masterBar.calculateDuration()),
      0,
    );
    const firstMasterBar = score.masterBars[0];
    return {
      version: SCORE_EVENT_VERSION,
      ticksPerQuarter: TICKS_PER_QUARTER,
      totalTicks,
      totalMeasures: score.masterBars.length,
      timeSignature: firstMasterBar
        ? `${firstMasterBar.timeSignatureNumerator}/${firstMasterBar.timeSignatureDenominator}`
        : input.timeSignature,
      defaultBpm: input.defaultBpm,
      tracks,
      events: events.sort(
        (left, right) =>
          left.startTick - right.startTick ||
          left.trackIndex - right.trackIndex ||
          left.voiceIndex - right.voiceIndex,
      ),
    };
  }

  private instrumentFor(track: alphaTab.model.Track, tuning: number[]): ScoreTrack['instrument'] {
    if (track.isPercussion || !tuning.length) return 'OTHER';
    return tuning.length <= 4 ? 'BASS' : 'GUITAR';
  }

  private beatEffects(beat: alphaTab.model.Beat): ScoreEffect[] {
    const effects: ScoreEffect[] = [];
    if (beat.pickStroke === alphaTab.model.PickStroke.Up)
      effects.push({ type: 'PICK_STROKE', direction: 'UP' });
    if (beat.pickStroke === alphaTab.model.PickStroke.Down)
      effects.push({ type: 'PICK_STROKE', direction: 'DOWN' });
    if (beat.tremoloPicking)
      effects.push({
        type: 'TREMOLO_PICKING',
        marks: beat.tremoloPicking.marks,
        style:
          beat.tremoloPicking.style === alphaTab.model.TremoloPickingStyle.BuzzRoll
            ? 'BUZZ_ROLL'
            : 'DEFAULT',
      });
    if (beat.brushType === alphaTab.model.BrushType.ArpeggioUp)
      effects.push({ type: 'ARPEGGIO', direction: 'UP' });
    if (beat.brushType === alphaTab.model.BrushType.ArpeggioDown)
      effects.push({ type: 'ARPEGGIO', direction: 'DOWN' });
    if (beat.vibrato !== alphaTab.model.VibratoType.None) effects.push({ type: 'VIBRATO' });
    return effects;
  }

  private noteEffects(
    note: alphaTab.model.Note,
    durationTicks: number,
    eventIdByNote: Map<object, string>,
  ): ScoreNoteEffect[] {
    const effects: ScoreNoteEffect[] = [];
    if (note.hasBend) {
      const points = (note.bendPoints ?? []).map((point) => ({
        offsetTicks: Math.round((durationTicks * point.offset) / 60),
        semitones: point.value / 4,
      }));
      const targetSemitones = Math.max(0, ...points.map((point) => point.semitones));
      effects.push({
        type: 'BEND',
        bendType: this.bendType(note.bendType),
        style: this.bendStyle(note.bendStyle),
        points,
        ...(targetSemitones ? { targetSemitones } : {}),
      });
    }
    if (note.isHammerPullOrigin)
      effects.push({
        type: 'HAMMER_PULL',
        ...(note.hammerPullDestination
          ? { destinationEventId: eventIdByNote.get(note.hammerPullDestination) }
          : {}),
      });
    const slide = this.slideEffect(note, eventIdByNote);
    if (slide) effects.push(slide);
    if (note.isPalmMute) effects.push({ type: 'PALM_MUTE' });
    if (note.isLetRing) effects.push({ type: 'LET_RING' });
    if (note.vibrato !== alphaTab.model.VibratoType.None) effects.push({ type: 'VIBRATO' });
    if (note.isHarmonic)
      effects.push({ type: 'HARMONIC', kind: this.harmonicType(note.harmonicType) });
    if (note.isDead) effects.push({ type: 'DEAD_NOTE' });
    if (note.isGhost) effects.push({ type: 'GHOST_NOTE' });
    if (note.isStaccato) effects.push({ type: 'STACCATO' });
    return effects;
  }

  private bendType(
    type: alphaTab.model.BendType,
  ): Extract<ScoreNoteEffect, { type: 'BEND' }>['bendType'] {
    const values = [
      'CUSTOM',
      'BEND',
      'RELEASE',
      'BEND_RELEASE',
      'HOLD',
      'PREBEND',
      'PREBEND_BEND',
      'PREBEND_RELEASE',
    ] as const;
    return values[type - 1] ?? 'CUSTOM';
  }

  private bendStyle(
    style: alphaTab.model.BendStyle,
  ): Extract<ScoreNoteEffect, { type: 'BEND' }>['style'] {
    const values = ['DEFAULT', 'GRADUAL', 'FAST'] as const;
    return values[style] ?? 'DEFAULT';
  }

  private harmonicType(
    type: alphaTab.model.HarmonicType,
  ): Extract<ScoreNoteEffect, { type: 'HARMONIC' }>['kind'] {
    const values = ['NATURAL', 'ARTIFICIAL', 'PINCH', 'TAP', 'SEMI', 'FEEDBACK'] as const;
    return values[type - 1] ?? 'NATURAL';
  }

  private slideEffect(
    note: alphaTab.model.Note,
    eventIdByNote: Map<object, string>,
  ): Extract<ScoreNoteEffect, { type: 'SLIDE' }> | undefined {
    const direction: Extract<ScoreNoteEffect, { type: 'SLIDE' }>['direction'] | undefined =
      note.slideInType === alphaTab.model.SlideInType.IntoFromBelow
        ? 'IN_FROM_BELOW'
        : note.slideInType === alphaTab.model.SlideInType.IntoFromAbove
          ? 'IN_FROM_ABOVE'
          : note.slideOutType === alphaTab.model.SlideOutType.Shift
            ? 'SHIFT'
            : note.slideOutType === alphaTab.model.SlideOutType.Legato
              ? 'LEGATO'
              : note.slideOutType === alphaTab.model.SlideOutType.OutUp
                ? 'OUT_UP'
                : note.slideOutType === alphaTab.model.SlideOutType.OutDown
                  ? 'OUT_DOWN'
                  : undefined;
    if (!direction) return undefined;
    return {
      type: 'SLIDE' as const,
      direction,
      ...(note.slideTarget ? { destinationEventId: eventIdByNote.get(note.slideTarget) } : {}),
    };
  }
}
