import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class CreateSessionDto {
  @ApiProperty({ description: 'Exercise ID from the practice library' })
  @IsString()
  exerciseId!: string;
  @ApiPropertyOptional({ description: 'Optional loop region ID' })
  @IsOptional()
  @IsString()
  loopRegionId?: string;
  @ApiPropertyOptional({ minimum: 20, maximum: 400 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(400)
  targetBpm?: number;
}
