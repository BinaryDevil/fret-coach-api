import { Module } from '@nestjs/common';
import { ScoreEventGeneratorService } from './score-event-generator.service';

@Module({ providers: [ScoreEventGeneratorService], exports: [ScoreEventGeneratorService] })
export class ScoresModule {}
