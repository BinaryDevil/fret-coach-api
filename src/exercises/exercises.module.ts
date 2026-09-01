import { Module } from '@nestjs/common';
import { ScoresModule } from '../scores/scores.module';
import { PracticeAttemptsModule } from '../practice-attempts/practice-attempts.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
@Module({
  imports: [ScoresModule, PracticeAttemptsModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
