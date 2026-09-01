import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePracticeAttemptDto } from './dto/create-practice-attempt.dto';
import { ListPracticeAttemptsDto } from './dto/list-practice-attempts.dto';
import { PracticeAttemptsService } from './practice-attempts.service';

@ApiTags('practice-attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('practice-attempts')
export class PracticeAttemptsController {
  constructor(private readonly attempts: PracticeAttemptsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePracticeAttemptDto) {
    return this.attempts.create(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListPracticeAttemptsDto) {
    return this.attempts.list(user.sub, query);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.attempts.get(user.sub, id);
  }
}
