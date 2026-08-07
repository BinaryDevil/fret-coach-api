import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
export class CreateSessionDto {
  @ApiProperty({ description: '练习库中的练习 ID' }) @IsString() exerciseId!: string;
  @ApiPropertyOptional({ description: '可选循环片段 ID' })
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
