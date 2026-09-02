import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoresModule } from '../scores/scores.module';
import { ScoreImportsController } from './score-imports.controller';
import { PublicScoresController } from './public-scores.controller';
import { ScoreImportsService } from './score-imports.service';
import { ScoreStorageService } from './score-storage.service';

@Module({
  imports: [PrismaModule, ScoresModule],
  controllers: [ScoreImportsController, PublicScoresController],
  providers: [ScoreImportsService, ScoreStorageService],
})
export class ScoreImportsModule {}
