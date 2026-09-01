import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PracticeAttemptsService } from '../practice-attempts/practice-attempts.service';
import { ListExercisesDto } from './dto/list-exercises.dto';
import { ExercisesService } from './exercises.service';
@ApiTags('exercises')
@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercises: ExercisesService,
    private readonly practiceAttempts: PracticeAttemptsService,
  ) {}
  @Get() list(@Query() query: ListExercisesDto) {
    return this.exercises.list(query);
  }
  @Get('slug/:slug') getBySlug(@Param('slug') slug: string) {
    return this.exercises.getBySlug(slug);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/progress')
  progress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.practiceAttempts.exerciseProgress(user.sub, id);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.exercises.get(id);
  }
}
