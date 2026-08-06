import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateRecordingDto } from './dto/create-recording.dto';
import { PracticeSessionsService } from './practice-sessions.service';
@ApiTags('practice-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('practice-sessions')
export class PracticeSessionsController {
  constructor(private readonly sessions: PracticeSessionsService) {}
  @Post() create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    return this.sessions.create(user.sub, dto);
  }
  @Post(':id/recordings') addRecording(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateRecordingDto,
  ) {
    return this.sessions.addRecording(user.sub, id, dto);
  }
  @Post(':id/complete') complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sessions.complete(user.sub, id);
  }
}
