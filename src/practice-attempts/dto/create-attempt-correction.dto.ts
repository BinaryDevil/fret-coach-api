import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttemptCorrectionSubject } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAttemptCorrectionDto {
  @ApiProperty({ enum: AttemptCorrectionSubject })
  @IsEnum(AttemptCorrectionSubject)
  subject!: AttemptCorrectionSubject;

  @ApiProperty({ description: 'Whether the shown diagnosis or intervention was helpful.' })
  @IsBoolean()
  isHelpful!: boolean;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
