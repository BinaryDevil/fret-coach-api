import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
export class CreateSessionDto {
  @ApiPropertyOptional({ description: '练习库中的练习 ID；与 pieceTitle 二选一。' })
  @IsOptional()
  @IsString()
  exerciseId?: string;
  @ApiPropertyOptional({ description: '整曲练习名称；与 exerciseId 二选一。' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pieceTitle?: string;
  @ApiPropertyOptional({ description: '已上传曲谱的 URL。' })
  @IsOptional()
  @IsUrl()
  sheetMusicUrl?: string;
  @ApiPropertyOptional({ description: '伴奏 URL；后续可由伴奏生成服务填充。' })
  @IsOptional()
  @IsUrl()
  backingTrackUrl?: string;
}
