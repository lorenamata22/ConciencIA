import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAllByInstitution(institutionId: string) {
    return this.prisma.subject.findMany({
      where: { course: { institution_id: institutionId } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
        files: {
          where: { document_type: DocumentType.main },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { id: true, name: true, url: true, size: true },
        },
      },
    });
  }

  async create(institutionId: string, dto: CreateSubjectDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, institution_id: institutionId },
    });
    if (!course) throw new NotFoundException('Curso não encontrado ou não pertence à instituição');

    return this.prisma.subject.create({
      data: {
        course_id: dto.courseId,
        name: dto.name,
      },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  async update(institutionId: string, subjectId: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
    });
    if (!subject) throw new NotFoundException('Asignatura não encontrada');

    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, institution_id: institutionId },
      });
      if (!course) throw new NotFoundException('Curso não encontrado ou não pertence à instituição');
    }

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: dto.name,
        ...(dto.courseId && { course_id: dto.courseId }),
      },
      select: {
        id: true,
        name: true,
        course: { select: { id: true, name: true } },
      },
    });
  }

  async uploadProgram(
    institutionId: string,
    subjectId: string,
    file: Express.Multer.File,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
    });
    if (!subject) throw new NotFoundException('Asignatura não encontrada');

    const existing = await this.prisma.file.findFirst({
      where: { subject_id: subjectId, document_type: DocumentType.main },
      orderBy: { created_at: 'desc' },
    });
    if (existing) {
      await this.storage.deleteByUrl(existing.url).catch(() => null);
      await this.prisma.file.delete({ where: { id: existing.id } });
    }

    const ext = extname(file.originalname);
    const storagePath = `institutions/${institutionId}/subjects/${subjectId}/${randomUUID()}${ext}`;
    const url = await this.storage.upload(storagePath, file.buffer, file.mimetype);

    return this.prisma.file.create({
      data: {
        institution_id: institutionId,
        subject_id: subjectId,
        name: file.originalname,
        type: file.mimetype,
        document_type: DocumentType.main,
        url,
        size: file.size,
        is_ai_context: true,
      },
      select: { id: true, name: true, url: true, size: true, ingestion_status: true },
    });
  }

  async remove(institutionId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
    });
    if (!subject) throw new NotFoundException('Asignatura não encontrada');

    await this.prisma.subject.delete({ where: { id: subjectId } });
    return { deleted: true };
  }
}
