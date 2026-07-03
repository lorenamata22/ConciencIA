import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('teachers')
@UseGuards(RolesGuard)
@Roles('institution')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('dashboard')
  @Roles('teacher')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.teacherService.getDashboardStats(user.userId);
  }

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.teacherService.findAllByInstitution(user.institutionId);
  }

  @Post('me')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto, user.institutionId);
  }

  @Get('me/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.teacherService.findOne(id, user.institutionId);
  }

  @Patch('me/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teacherService.update(id, dto, user.institutionId);
  }

  @Delete('me/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.teacherService.remove(id, user.institutionId);
  }

  @Post('me/:id/send-access-email')
  sendAccessEmail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.teacherService.sendAccessEmail(id, user.institutionId);
  }

  @Post('me/:id/regenerate-access-code')
  regenerateAccessCode(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.teacherService.regenerateAccessCode(id, user.institutionId);
  }
}
