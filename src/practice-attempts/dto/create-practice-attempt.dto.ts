import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PracticeNoteOutcome } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BendDiagnosticDto {
  @ApiProperty()
  @IsBoolean()
  reachedTarget!: boolean;

  @ApiProperty({ minimum: 0, maximum: 127 })
  @IsNumber()
  @Min(0)
  @Max(127)
  peakMidi!: number;

  @ApiProperty()
  @IsNumber()
  @Min(-2400)
  @Max(2400)
  targetCentsError!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reachedTargetAtMs?: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  holdDurationMs!: number;
}

export class CreatePracticeNoteResultDto {
  @ApiProperty()
  @IsString()
  timelineEventId!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  eventIndex!: number;

  @ApiProperty({ enum: PracticeNoteOutcome })
  @IsEnum(PracticeNoteOutcome)
  outcome!: PracticeNoteOutcome;

  @ApiPropertyOptional({ minimum: 0, maximum: 127 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(127)
  detectedMidi?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 127 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(127)
  correctedMidi?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  centsOffset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  octaveShift?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timingOffsetMs?: number;

  @ApiPropertyOptional({ type: BendDiagnosticDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BendDiagnosticDto)
  bend?: BendDiagnosticDto;
}

export class CreatePracticeAttemptDto {
  @ApiProperty({ description: 'UUID generated once by the client for idempotent retries' })
  @IsUUID()
  clientRunId!: string;

  @ApiPropertyOptional({ description: 'Curated Technique exercise ID' })
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @ApiPropertyOptional({ description: 'Private arrangement import ID' })
  @IsOptional()
  @IsString()
  scoreImportId?: string;

  @ApiPropertyOptional({ description: 'Private-arrangement track ID selected for the passage' })
  @IsOptional()
  @IsString()
  trackId?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passageStartMeasure?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  passageEndMeasure?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loopRegionId?: string;

  @ApiProperty({ description: 'The score.revision returned with the exercise detail' })
  @IsString()
  scoreRevision!: string;

  @ApiProperty({ minimum: 20, maximum: 400 })
  @IsInt()
  @Min(20)
  @Max(400)
  bpm!: number;

  @ApiProperty({ enum: [0, 2, 4] })
  @IsInt()
  @IsIn([0, 2, 4])
  countInBeats!: number;

  @ApiProperty({ minimum: 0, maximum: 86400000 })
  @IsInt()
  @Min(0)
  @Max(86400000)
  activeDurationMs!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiProperty({ type: [CreatePracticeNoteResultDto] })
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => CreatePracticeNoteResultDto)
  noteResults!: CreatePracticeNoteResultDto[];
}
