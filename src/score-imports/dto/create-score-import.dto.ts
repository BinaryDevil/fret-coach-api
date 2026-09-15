import { ScoreFormat } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateScoreImportDto {
  @ApiProperty({ example: 'My Practice Song' })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ example: 'Independent Artist' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  artist?: string;

  @ApiProperty({ enum: ScoreFormat, example: ScoreFormat.GUITAR_PRO })
  @IsEnum(ScoreFormat)
  format!: ScoreFormat;

  @ApiProperty({ example: 'my-song.gp' })
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/octet-stream' })
  @IsString()
  @Matches(/^[\w.+-]+\/[\w.+-]+$/)
  mimeType!: string;

  @ApiProperty({ example: 184320 })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes!: number;
}
