import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourseModuleService } from './course-module.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('modules')
@UseGuards(RolesGuard)
@Roles('institution', 'teacher')
export class CourseModuleController {
  constructor(private readonly courseModuleService: CourseModuleService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCourseModuleDto,
  ) {
    return this.courseModuleService.create(dto, user.institutionId);
  }

  // GET /modules?subject_id=... — módulos de uma matéria (ordem asc)
  @Get()
  findBySubject(
    @CurrentUser() user: JwtPayload,
    @Query('subject_id') subjectId: string,
  ) {
    return this.courseModuleService.findBySubject(subjectId, user.institutionId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.courseModuleService.findOne(id, user.institutionId);
  }
}
