import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentInstitutionDto } from './dto/create-student-institution.dto';
import { UpdateStudentInstitutionDto } from './dto/update-student-institution.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('students')
@UseGuards(RolesGuard)
@Roles('institution')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.studentService.findAllByInstitution(user.institutionId);
  }

  @Post('me')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentInstitutionDto) {
    return this.studentService.createByInstitution(dto, user.institutionId);
  }

  @Get('me/:userId')
  findOne(@CurrentUser() user: JwtPayload, @Param('userId') userId: string) {
    return this.studentService.findOneByUserId(userId, user.institutionId);
  }

  @Patch('me/:userId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateStudentInstitutionDto,
  ) {
    return this.studentService.updateByUserId(userId, dto, user.institutionId);
  }
}
