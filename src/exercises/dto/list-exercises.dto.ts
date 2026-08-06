import { ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty, ExerciseType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
export class ListExercisesDto {
  @ApiPropertyOptional({ enum: ExerciseType })
  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;
  @ApiPropertyOptional({ enum: Difficulty })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
}
