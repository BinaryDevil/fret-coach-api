import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PracticeNoteOutcome } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
}

export class CreatePracticeAttemptDto {
  @ApiProperty({ description: 'UUID generated once by the client for idempotent retries' })
  @IsUUID()
  clientRunId!: string;

  @ApiProperty()
  @IsString()
  exerciseId!: string;

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
