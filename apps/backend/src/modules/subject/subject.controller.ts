import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SubjectService } from './subject.service';
import { ProgramParseService } from './program-parse.service';
import { RagCoverageService } from './rag-coverage.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { CreateSubjectWithModulesDto } from './dto/create-subject-with-modules.dto';
import { SyncSubjectStructureDto } from './dto/sync-subject-structure.dto';
import {
  PROGRAM_ACCEPTED_MIME_TYPES,
  PROGRAM_MAX_FILE_SIZE_BYTES,
} from './program.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('subjects')
@UseGuards(RolesGuard)
@Roles('institution', 'teacher')
export class SubjectController {
  constructor(
    private readonly subjectService: SubjectService,
    private readonly programParseService: ProgramParseService,
    private readonly ragCoverageService: RagCoverageService,
  ) {}

  @Get('me')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.subjectService.findAllByInstitution(user.institutionId);
  }

  // Matérias do aluno logado (seleção no Chat) — @Roles no método
  // sobrescreve o class-level (getAllAndOverride no RolesGuard)
  @Get('student/me')
  @Roles('student')
  findAllForStudent(@CurrentUser() user: JwtPayload) {
    return this.subjectService.findAllByStudent(user.userId);
  }

  @Get('student/me/:id/exam-outline')
  @Roles('student')
  getExamOutline(
    @CurrentUser() user: JwtPayload,
    @Param('id') subjectId: string,
  ) {
    return this.subjectService.getExamOutlineForStudent(user.userId, subjectId);
  }

  // Parse do programa de asignatura (§14) — SEM :id: a matéria ainda não
  // existe. Síncrono, NADA é persistido; devolve a estrutura para o review.
  @Post('program/parse')
  @Roles('institution')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PROGRAM_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(null, PROGRAM_ACCEPTED_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  parseProgram(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Formato de archivo no soportado. Usa PDF o DOCX (máximo 1MB).',
      );
    }
    return this.programParseService.parse(file, {
      userId: user.userId,
      institutionId: user.institutionId,
    });
  }

  @Post('me')
  @Roles('institution')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubjectDto) {
    return this.subjectService.create(user.institutionId, dto);
  }

  // Criação transacional a partir da estrutura já revisada (§14)
  @Post()
  @Roles('institution')
  createWithModules(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubjectWithModulesDto,
  ) {
    return this.subjectService.createWithModules(user.institutionId, dto);
  }

  @Patch('me/:id')
  @Roles('institution')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectService.update(user.institutionId, id, dto);
  }

  // Cobertura do programa pelo material do RAG — tela de Documentación.
  // Aberta a teacher também (a rota structure abaixo é institution-only).
  @Get('me/:id/rag-coverage')
  @Roles('institution', 'teacher')
  getRagCoverage(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ragCoverageService.getCoverage(
      user.institutionId,
      id,
      user.userId,
    );
  }

  // Matéria + estrutura — tela de edição da instituição
  @Get('me/:id/structure')
  @Roles('institution')
  findOneWithStructure(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.subjectService.findOneWithStructure(user.institutionId, id);
  }

  // Edição da estrutura (módulos/tópicos) de uma matéria existente
  @Put('me/:id/structure')
  @Roles('institution')
  syncStructure(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SyncSubjectStructureDto,
  ) {
    return this.subjectService.syncStructure(user.institutionId, id, dto);
  }

  @Delete('me/:id')
  @Roles('institution')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.subjectService.remove(user.institutionId, id);
  }
}
