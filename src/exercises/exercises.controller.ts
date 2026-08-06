import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListExercisesDto } from './dto/list-exercises.dto';
import { ExercisesService } from './exercises.service';
@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}
  @Get() list(@Query() query: ListExercisesDto) {
    return this.exercises.list(query);
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.exercises.get(id);
  }
}
