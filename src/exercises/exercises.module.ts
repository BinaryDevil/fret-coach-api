import { Module } from '@nestjs/common';
import { ScoresModule } from '../scores/scores.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
@Module({
  imports: [ScoresModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
