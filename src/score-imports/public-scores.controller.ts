import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListPublicScoresDto } from './dto/list-public-scores.dto';
import { ScoreImportsService } from './score-imports.service';

@ApiTags('public-scores')
@Controller('public-scores')
export class PublicScoresController {
  constructor(private readonly scoreImports: ScoreImportsService) {}

  @Get(':id/source')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sourceUrl(@Param('id') id: string) {
    return this.scoreImports.publicSourceUrl(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.scoreImports.getPublic(id);
  }

  @Get()
  list(@Query() query: ListPublicScoresDto) {
    return this.scoreImports.listPublic(query);
  }
}
