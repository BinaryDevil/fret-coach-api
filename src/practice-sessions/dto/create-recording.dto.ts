import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class CreateRecordingDto {
  @ApiProperty({
    description:
      'Audio object key in storage; upload is completed by the client direct-upload flow.',
  })
  @IsString()
  @MaxLength(500)
  storageKey!: string;
  @ApiProperty({ example: 'audio/webm' }) @IsString() @MaxLength(100) mimeType!: string;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsInt() @Min(1) durationMs?: number;
}
