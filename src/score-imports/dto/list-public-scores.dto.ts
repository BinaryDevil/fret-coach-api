import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScoreFormat } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPublicScoresDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  @ApiPropertyOptional({ description: 'Opaque cursor returned by the previous page.' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive title or artist search.' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ScoreFormat })
  @IsOptional()
  @IsEnum(ScoreFormat)
  format?: ScoreFormat;
}
