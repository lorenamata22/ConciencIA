import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('institutions')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutionService.create(dto);
  }

  @Get()
  findAll() {
    return this.institutionService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.institutionService.getStats();
  }

  @Get(':id/stats')
  getDetailStats(@Param('id') id: string) {
    return this.institutionService.getDetailStats(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionService.update(id, dto);
  }
}
