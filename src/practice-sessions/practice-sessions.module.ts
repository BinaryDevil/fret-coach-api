import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { PracticeSessionsController } from './practice-sessions.controller';
import { PracticeSessionsService } from './practice-sessions.service';
@Module({
  imports: [ProgressModule],
  controllers: [PracticeSessionsController],
  providers: [PracticeSessionsService],
})
export class PracticeSessionsModule {}
