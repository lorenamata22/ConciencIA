import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SetGradeDto } from './dto/set-grade.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('tasks')
@UseGuards(RolesGuard)
@Roles('teacher')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // Matérias e turmas do professor para os dropdowns do formulário
  @Get('me/form-options')
  getFormOptions(@CurrentUser() user: JwtPayload) {
    return this.taskService.getFormOptions(user.userId);
  }

  // Tareas + nota do aluno numa turma (tela Alumnos)
  @Get('me/students/:studentId/grades')
  getStudentGrades(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query('classId') classId: string,
  ) {
    return this.taskService.getStudentGrades(user.userId, studentId, classId);
  }

  @Get('me')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.taskService.findAllByTeacher(user.userId, subjectId);
  }

  @Get('me/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.taskService.findOne(user.userId, id);
  }

  @Post('me')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.taskService.create(user.userId, user.institutionId, dto);
  }

  @Patch('me/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.taskService.update(user.userId, id, dto);
  }

  @Delete('me/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.taskService.remove(user.userId, id);
  }

  @Put('me/:id/students/:studentId/grade')
  setGrade(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: SetGradeDto,
  ) {
    return this.taskService.setGrade(user.userId, id, studentId, dto.value);
  }
}
