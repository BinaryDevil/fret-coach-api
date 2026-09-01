import { Module } from '@nestjs/common';
import { PracticeAttemptsController } from './practice-attempts.controller';
import { PracticeAttemptsService } from './practice-attempts.service';

@Module({
  controllers: [PracticeAttemptsController],
  providers: [PracticeAttemptsService],
  exports: [PracticeAttemptsService],
})
export class PracticeAttemptsModule {}
