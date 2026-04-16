import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { FileService } from './file.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('FileService', () => {
  let service: FileService;
  let prismaMock: PrismaMock;
  let ragQueue: { add: jest.Mock };

  const institutionId = 'inst-id-1';

  const mockFile = {
    id: 'file-id-1',
    institution_id: institutionId,
    subject_id: 'subject-id-1',
    topic_id: null,
    name: 'aula-01.pdf',
    type: 'pdf',
    document_type: 'main',
    url: 'https://storage/aula-01.pdf',
    size: 1024000,
    is_ai_context: true,
    ingestion_status: 'pending',
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    ragQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: getQueueToken('rag-ingestion'), useValue: ragQueue },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  describe('upload', () => {
    it('should save file metadata and return immediately (async processing)', async () => {
      prismaMock.file.create.mockResolvedValue(mockFile as any);

      const result = await service.upload(
        {
          name: 'aula-01.pdf',
          type: 'pdf',
          document_type: 'main',
          url: 'https://storage/aula-01.pdf',
          size: 1024000,
          subject_id: 'subject-id-1',
          is_ai_context: true,
        },
        institutionId,
      );

      expect(result.id).toBe('file-id-1');
      // Deve retornar imediatamente sem aguardar processamento
      expect(result.ingestion_status).toBe('pending');
    });

    it('should enqueue rag-ingestion job when is_ai_context is true', async () => {
      prismaMock.file.create.mockResolvedValue(mockFile as any);

      await service.upload(
        {
          name: 'aula-01.pdf',
          type: 'pdf',
          document_type: 'main',
          url: 'https://storage/aula-01.pdf',
          size: 1024000,
          subject_id: 'subject-id-1',
          is_ai_context: true,
        },
        institutionId,
      );

      expect(ragQueue.add).toHaveBeenCalledWith(
        'rag-ingestion',
        expect.objectContaining({
          fileId: 'file-id-1',
          institutionId,
          replaceExisting: false,
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should NOT enqueue rag-ingestion job when is_ai_context is false', async () => {
      prismaMock.file.create.mockResolvedValue({
        ...mockFile,
        is_ai_context: false,
      } as any);

      await service.upload(
        {
          name: 'arquivo.pdf',
          type: 'pdf',
          document_type: 'supplementary',
          url: 'https://storage/arquivo.pdf',
          size: 512000,
          subject_id: 'subject-id-1',
          is_ai_context: false,
        },
        institutionId,
      );

      expect(ragQueue.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when file type is not supported', async () => {
      await expect(
        service.upload(
          {
            name: 'arquivo.exe',
            type: 'exe',
            document_type: 'main',
            url: 'https://storage/arquivo.exe',
            size: 1024,
            subject_id: 'subject-id-1',
            is_ai_context: false,
          },
          institutionId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('replace', () => {
    it('should enqueue job with replaceExisting=true when replacing is_ai_context file', async () => {
      prismaMock.file.findUnique.mockResolvedValue(mockFile as any);
      prismaMock.file.update.mockResolvedValue({
        ...mockFile,
        url: 'https://storage/aula-01-v2.pdf',
        ingestion_status: 'pending',
      } as any);

      await service.replace('file-id-1', 'https://storage/aula-01-v2.pdf', institutionId);

      expect(ragQueue.add).toHaveBeenCalledWith(
        'rag-ingestion',
        expect.objectContaining({
          fileId: 'file-id-1',
          replaceExisting: true,
        }),
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should throw ForbiddenException when file belongs to different institution', async () => {
      prismaMock.file.findUnique.mockResolvedValue({
        ...mockFile,
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.replace('file-id-1', 'https://storage/new.pdf', institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByInstitution', () => {
    it('should return files filtered by institution_id', async () => {
      prismaMock.file.findMany.mockResolvedValue([mockFile] as any);

      await service.findAllByInstitution(institutionId);

      expect(prismaMock.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });
});
