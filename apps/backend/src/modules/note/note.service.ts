import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

// Notas na lixeira com mais de 7 dias são purgadas permanentemente
const TRASH_RETENTION_DAYS = 7;
// Prévia do conteúdo exibida nos cards da coluna central
const PREVIEW_LENGTH = 120;

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  // Localiza o student_id a partir do user_id do JWT
  private async getStudentIdOrThrow(userId: string): Promise<string> {
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Alumno no encontrado');
    return student.id;
  }

  // Carrega a nota garantindo que pertence ao aluno
  private async getOwnedNoteOrThrow(studentId: string, id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Apunte no encontrado');
    if (note.student_id !== studentId)
      throw new ForbiddenException('Este apunte no pertenece al alumno');
    return note;
  }

  // Cria a nota a partir de uma mensagem do chat — matéria, tópico e título
  // derivam da conversa (imune ao problema do id local do streaming)
  async create(userId: string, dto: CreateNoteDto) {
    const studentId = await this.getStudentIdOrThrow(userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversation_id },
      include: { topic: { select: { id: true, title: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversación no encontrada');
    if (conversation.student_id !== studentId)
      throw new ForbiddenException('La conversación no pertenece al alumno');

    return this.prisma.note.create({
      data: {
        student_id: studentId,
        subject_id: conversation.subject_id,
        topic_id: conversation.topic_id,
        source_message_id: dto.source_message_id ?? null,
        title: conversation.topic.title,
        content: dto.content,
      },
    });
  }

  // Notas ativas (não deletadas) do aluno — cards da coluna central
  async findByStudent(userId: string, subjectId?: string) {
    const studentId = await this.getStudentIdOrThrow(userId);

    const notes = await this.prisma.note.findMany({
      where: {
        student_id: studentId,
        deleted_at: null,
        ...(subjectId ? { subject_id: subjectId } : {}),
      },
      orderBy: { updated_at: 'desc' },
      include: { subject: { select: { id: true, name: true } } },
    });

    return notes.map((note) => this.toCard(note));
  }

  // Detalhe da nota (3ª coluna) — inclui o nome da matéria para o cabeçalho
  async findOne(userId: string, id: string) {
    const studentId = await this.getStudentIdOrThrow(userId);

    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { subject: { select: { id: true, name: true } } },
    });
    if (!note) throw new NotFoundException('Apunte no encontrado');
    if (note.student_id !== studentId)
      throw new ForbiddenException('Este apunte no pertenece al alumno');
    return note;
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    const studentId = await this.getStudentIdOrThrow(userId);
    await this.getOwnedNoteOrThrow(studentId, id);

    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
    });
  }

  // Soft delete — move para a lixeira
  async remove(userId: string, id: string) {
    const studentId = await this.getStudentIdOrThrow(userId);
    await this.getOwnedNoteOrThrow(studentId, id);

    return this.prisma.note.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  // Lixeira: purga preguiçosa (> 7 dias) e devolve as notas ainda restauráveis
  async findTrash(userId: string) {
    const studentId = await this.getStudentIdOrThrow(userId);

    const cutoff = new Date(
      Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.note.deleteMany({
      where: { student_id: studentId, deleted_at: { lt: cutoff } },
    });

    const notes = await this.prisma.note.findMany({
      where: { student_id: studentId, deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
      include: { subject: { select: { id: true, name: true } } },
    });

    return notes.map((note) => this.toCard(note));
  }

  // Restaura da lixeira
  async restore(userId: string, id: string) {
    const studentId = await this.getStudentIdOrThrow(userId);
    await this.getOwnedNoteOrThrow(studentId, id);

    return this.prisma.note.update({
      where: { id },
      data: { deleted_at: null },
    });
  }

  // Monta o card da coluna central (título, prévia, matéria, datas)
  private toCard(note: {
    id: string;
    subject_id: string;
    topic_id: string;
    title: string;
    content: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    subject?: { id: string; name: string };
  }) {
    return {
      id: note.id,
      subject_id: note.subject_id,
      subject_name: note.subject?.name ?? null,
      topic_id: note.topic_id,
      title: note.title,
      preview: note.content.slice(0, PREVIEW_LENGTH),
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted_at: note.deleted_at,
    };
  }
}
