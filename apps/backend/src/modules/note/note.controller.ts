import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

// "Mis Apuntes" — notas do aluno salvas a partir do chat Modo Estudo
@Controller('notes')
@UseGuards(RolesGuard)
@Roles('student')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  // Lixeira — declarada antes de :id para não colidir na rota
  @Get('trash')
  findTrash(@CurrentUser() user: JwtPayload) {
    return this.noteService.findTrash(user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.noteService.findByStudent(user.userId, subjectId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.noteService.findOne(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateNoteDto) {
    return this.noteService.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.noteService.update(user.userId, id, dto);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.noteService.restore(user.userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.noteService.remove(user.userId, id);
  }
}
