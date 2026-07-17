import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator';

// Modo Exame (CLAUDE.md §8): sem streaming — request/response normais com
// envelope do ResponseInterceptor. Apenas alunos geram/respondem exames.
@Controller('exams')
@UseGuards(RolesGuard)
@Roles('student')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExamDto) {
    return this.examService.generate(user.userId, user.institutionId, dto);
  }

  @Post(':id/answers')
  submitAnswers(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) examId: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.examService.submitAnswers(
      user.userId,
      user.institutionId,
      examId,
      dto,
    );
  }

  @Get(':id')
  getResult(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) examId: string,
  ) {
    return this.examService.getResult(user.userId, user.institutionId, examId);
  }
}
