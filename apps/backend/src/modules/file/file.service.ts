import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { File } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QUEUE_RAG_INGESTION } from '../rag/rag.constants';
import { RagIngestionJob } from '../rag/rag.types';
import { ALLOWED_FILE_TYPES } from './file.constants';
import { CreateFileDto } from './dto/create-file.dto';

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_RAG_INGESTION)
    private readonly ragQueue: Queue<RagIngestionJob>,
  ) {}

  // Salva os metadados e retorna imediatamente — o embedding NUNCA é
  // processado de forma síncrona no upload (CLAUDE.md §19)
  async upload(dto: CreateFileDto, institutionId: string): Promise<File> {
    if (!ALLOWED_FILE_TYPES.includes(dto.type.toLowerCase())) {
      throw new BadRequestException(
        `Tipo de arquivo não suportado: "${dto.type}". Tipos aceitos: ${ALLOWED_FILE_TYPES.join(', ')}`,
      );
    }

    const file = await this.prisma.file.create({
      data: {
        institution_id: institutionId,
        name: dto.name,
        type: dto.type,
        document_type: dto.document_type,
        url: dto.url,
        size: dto.size,
        subject_id: dto.subject_id ?? null,
        topic_id: dto.topic_id ?? null,
        is_ai_context: dto.is_ai_context,
        ingestion_status: 'pending',
      },
    });

    if (file.is_ai_context) {
      await this.enqueueIngestion(file, false);
    }

    return file;
  }

  // Substituição de arquivo: o worker deleta os embeddings antigos antes de
  // reprocessar (replaceExisting: true)
  async replace(
    fileId: string,
    newUrl: string,
    institutionId: string,
  ): Promise<File> {
    const existing = await this.prisma.file.findUnique({
      where: { id: fileId },
    });
    if (!existing) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    if (existing.institution_id !== institutionId) {
      throw new ForbiddenException('Recurso não pertence ao tenant');
    }

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        url: newUrl,
        ingestion_status: 'pending',
        ingestion_error: null,
      },
    });

    if (updated.is_ai_context) {
      await this.enqueueIngestion(updated, true);
    }

    return updated;
  }

  // Exclui embeddings + registro na mesma transação (a FK embedding.file_id
  // não tem cascade) e o objeto no storage em best-effort
  async delete(fileId: string, institutionId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    if (file.institution_id !== institutionId) {
      throw new ForbiddenException('Recurso não pertence ao tenant');
    }

    await this.prisma.$transaction([
      this.prisma.embedding.deleteMany({ where: { file_id: fileId } }),
      this.prisma.file.delete({ where: { id: fileId } }),
    ]);

    await this.storage.deleteByUrl(file.url).catch(() => null);
  }

  findAllByInstitution(institutionId: string): Promise<File[]> {
    return this.prisma.file.findMany({
      where: { institution_id: institutionId },
      orderBy: { created_at: 'desc' },
    });
  }

  private enqueueIngestion(file: File, replaceExisting: boolean) {
    const job: RagIngestionJob = {
      fileId: file.id,
      institutionId: file.institution_id,
      subjectId: file.subject_id,
      topicId: file.topic_id,
      fileUrl: file.url,
      fileName: file.name,
      replaceExisting,
    };
    return this.ragQueue.add(QUEUE_RAG_INGESTION, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
