import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AnalysisService } from './analysis.service';
@ApiTags('analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recordings/:recordingId/analysis')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}
  @Post() queue(@CurrentUser() user: JwtPayload, @Param('recordingId') recordingId: string) {
    return this.analysis.queue(user.sub, recordingId);
  }
  @Get() get(@CurrentUser() user: JwtPayload, @Param('recordingId') recordingId: string) {
    return this.analysis.get(user.sub, recordingId);
  }
}
