import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateScoreImportVisibilityDto {
  @ApiProperty({
    description: 'Whether this ready import is discoverable in the public tab library.',
  })
  @IsBoolean()
  isPublic!: boolean;
}
