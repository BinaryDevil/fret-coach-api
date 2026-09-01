import { Injectable } from '@nestjs/common';
import { ScoreFormat } from '@prisma/client';
import * as alphaTab from '@coderline/alphatab';
import { createHash } from 'node:crypto';

export const SCORE_EVENT_VERSION = 1;
export const TICKS_PER_QUARTER = 960;

/** Stable client-facing identifier for the generated scoring timeline. */
export const scoreRevision = (eventVersion: number, eventSourceHash?: string | null): string =>
  `v${eventVersion}:${eventSourceHash ?? 'unprocessed'}`;

/**
 * A score event in musical ticks. Convert to the active playback timeline with:
 * milliseconds = (startTick / ticksPerQuarter) * (60_000 / currentBpm).
 */
export type ScoreNoteEvent = {
  id: string;
  measure: number;
  beat: number;
  startTick: number;
  durationTicks: number;
  ticksPerQuarter: number;
  trackIndex: number;
  voiceIndex: number;
  pitches: number[];
  notes: Array<{ midi: number; string?: number; fret?: number }>;
  isRest: boolean;
  techniques?: string[];
};

/** Versioned, BPM-independent scoring data returned on exercise detail responses. */
export type ScoreTimeline = {
  version: typeof SCORE_EVENT_VERSION;
  ticksPerQuarter: typeof TICKS_PER_QUARTER;
  totalTicks: number;
  totalMeasures: number;
  timeSignature: string;
  defaultBpm: number;
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
    const events: ScoreNoteEvent[] = [];

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
              const notes = beat.notes.map((note) => ({
                midi: note.realValue,
                ...(note.string > 0 ? { string: note.string } : {}),
                ...(note.fret >= 0 ? { fret: note.fret } : {}),
              }));
              const isRest = notes.length === 0;
              events.push({
                id: `m${measure}-b${Math.floor(beat.displayStart / beatTicks) + 1}-t${trackIndex}-v${voiceIndex}-e${eventOffset}`,
                measure,
                beat: Math.floor(beat.displayStart / beatTicks) + 1,
                startTick,
                durationTicks: beat.displayDuration,
                ticksPerQuarter: TICKS_PER_QUARTER,
                trackIndex,
                voiceIndex,
                pitches: notes.map((note) => note.midi),
                notes,
                isRest,
              });
            }
          }
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
      events: events.sort(
        (left, right) =>
          left.startTick - right.startTick ||
          left.trackIndex - right.trackIndex ||
          left.voiceIndex - right.voiceIndex,
      ),
    };
  }
}
