import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('courses')
@UseGuards(RolesGuard)
@Roles('institution')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.courseService.findAllByInstitution(user.institutionId);
  }

  @Post('me')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) {
    return this.courseService.create(user.institutionId, dto);
  }

  @Patch('me/:id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courseService.update(user.institutionId, id, dto);
  }

  @Delete('me/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.courseService.remove(user.institutionId, id);
  }
}
