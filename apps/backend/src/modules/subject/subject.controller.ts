import {
  Controller,
  Get,
  Post,
  Patch,
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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
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

  @Patch('me/:id')
  @Roles('institution')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(user.institutionId, id, dto);
  }

  @Post('me/:id/program')
  @Roles('institution')
  @UseInterceptors(
    FileInterceptor('program', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  uploadProgram(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Formato de arquivo não suportado. Use PDF ou DOCX.');
    return this.subjectService.uploadProgram(user.institutionId, id, file);
  }

  @Delete('me/:id')
  @Roles('institution')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.subjectService.remove(user.institutionId, id);
  }
}
