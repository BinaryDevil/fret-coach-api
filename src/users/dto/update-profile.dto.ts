import { ApiPropertyOptional } from '@nestjs/swagger';
import { Handedness } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @ApiPropertyOptional({ enum: Handedness })
  @IsOptional()
  @IsEnum(Handedness)
  handedness?: Handedness;
  @ApiPropertyOptional({ example: 'E2,A2,D3,G3,B3,E4' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tuning?: string;
  @ApiPropertyOptional({ example: 'America/Vancouver' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
