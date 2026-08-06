import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class CreateRecordingDto {
  @ApiProperty({ description: '对象存储中的音频对象 key；上传由前端直传流程完成。' })
  @IsString()
  @MaxLength(500)
  storageKey!: string;
  @ApiProperty({ example: 'audio/webm' }) @IsString() @MaxLength(100) mimeType!: string;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsInt() @Min(1) durationMs?: number;
}
