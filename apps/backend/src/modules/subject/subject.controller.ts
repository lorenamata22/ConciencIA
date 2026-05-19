import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('subjects')
@UseGuards(RolesGuard)
@Roles('institution', 'teacher')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.subjectService.findAllByInstitution(user.institutionId);
  }

  @Post('me')
  @Roles('institution')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubjectDto) {
    return this.subjectService.create(user.institutionId, dto);
  }

  @Delete('me/:id')
  @Roles('institution')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.subjectService.remove(user.institutionId, id);
  }
}
