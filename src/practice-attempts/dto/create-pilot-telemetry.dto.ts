import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PilotTelemetryEventType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePilotTelemetryDto {
  @ApiProperty({ description: 'Explicit consent to retain this structured pilot event.' })
  @IsBoolean()
  consent!: boolean;

  @ApiProperty()
  @IsString()
  scoreImportId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attemptId?: string;

  @ApiProperty({ enum: PilotTelemetryEventType })
  @IsEnum(PilotTelemetryEventType)
  eventType!: PilotTelemetryEventType;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  outcome?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  passageStartMeasure?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  passageEndMeasure?: number;
}
