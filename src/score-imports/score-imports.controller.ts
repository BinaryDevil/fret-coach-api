import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateScoreImportDto } from './dto/create-score-import.dto';
import { ListScoreImportsDto } from './dto/list-score-imports.dto';
import { ScoreImportsService } from './score-imports.service';

@ApiTags('score-imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('score-imports')
export class ScoreImportsController {
  constructor(private readonly scoreImports: ScoreImportsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateScoreImportDto) {
    return this.scoreImports.create(user.sub, dto);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scoreImports.complete(user.sub, id);
  }

  @Get(':id/source')
  sourceUrl(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scoreImports.sourceUrl(user.sub, id);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scoreImports.get(user.sub, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.scoreImports.remove(user.sub, id);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListScoreImportsDto) {
    return this.scoreImports.list(user.sub, query);
  }
}
