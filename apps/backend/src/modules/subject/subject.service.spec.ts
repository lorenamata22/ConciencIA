import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('SubjectService', () => {
  let service: SubjectService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockSubject = {
    id: 'subject-id-1',
    course_id: 'course-id-1',
    name: 'Matemática',
    description: 'Álgebra e geometria',
    course: { institution_id: institutionId },
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const storageMock = {
      upload: jest.fn(),
      deleteByUrl: jest.fn(),
      downloadByUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    service = module.get<SubjectService>(SubjectService);
  });

  describe('create', () => {
    it('should create subject when course belongs to institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);
      prismaMock.subject.create.mockResolvedValue(mockSubject as any);

      const result = await service.create(
        {
          course_id: 'course-id-1',
          name: 'Matemática',
          description: 'Álgebra',
        },
        institutionId,
      );

      expect(result.id).toBe('subject-id-1');
    });

    it('should throw ForbiddenException when course belongs to different institution', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.create(
          { course_id: 'course-id-1', name: 'Hack' },
          institutionId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should validate institution_id via course chain (Subject → Course → Institution)', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(mockSubject as any);

      const result = await service.findOne('subject-id-1', institutionId);
      expect(result.id).toBe('subject-id-1');
    });

    it('should throw ForbiddenException when subject chain points to different institution', async () => {
      prismaMock.subject.findUnique.mockResolvedValue({
        ...mockSubject,
        course: { institution_id: 'outro-inst' },
      } as any);

      await expect(
        service.findOne('subject-id-1', institutionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when subject does not exist', async () => {
      prismaMock.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('id-inexistente', institutionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByStudent', () => {
    it('should return subjects of the courses of the classes the student belongs to', async () => {
      prismaMock.subject.findMany.mockResolvedValue([mockSubject] as any);

      const result = await service.findAllByStudent('user-id-1');

      expect(result).toHaveLength(1);
      // Cadeia: Subject → Course → Class → StudentClass → Student.user_id
      expect(prismaMock.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            course: expect.objectContaining({
              classes: expect.objectContaining({
                some: expect.objectContaining({
                  studentClasses: expect.objectContaining({
                    some: expect.objectContaining({
                      student: expect.objectContaining({
                        user_id: 'user-id-1',
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('should return empty array when student has no classes', async () => {
      prismaMock.subject.findMany.mockResolvedValue([] as any);

      const result = await service.findAllByStudent('user-id-1');
      expect(result).toEqual([]);
    });
  });

  describe('findByCourse', () => {
    it('should return subjects filtered by course and institution chain', async () => {
      prismaMock.course.findUnique.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);
      prismaMock.subject.findMany.mockResolvedValue([mockSubject] as any);

      const result = await service.findByCourse('course-id-1', institutionId);
      expect(result).toHaveLength(1);
    });
  });

  describe('createWithModules', () => {
    const dto = {
      course_id: 'course-id-1',
      name: 'Matemática',
      modules: [
        {
          name: 'Aritmética',
          topics: [
            { title: 'Números naturales', description: 'Lectura y escritura' },
            { title: 'Divisibilidad', description: '' },
          ],
        },
        {
          name: 'Álgebra',
          topics: [{ title: 'Ecuaciones', description: 'Primer grado' }],
        },
      ],
    };

    const okCourse = () =>
      prismaMock.course.findFirst.mockResolvedValue({
        id: 'course-id-1',
        institution_id: institutionId,
      } as any);

    // $transaction executa o callback com o próprio prismaMock como tx
    const runTransaction = () =>
      prismaMock.$transaction.mockImplementation(
        async (cb: any) => cb(prismaMock) as any,
      );

    beforeEach(() => {
      prismaMock.subject.create.mockResolvedValue({ id: 'subject-id-1' } as any);
      prismaMock.module.create.mockImplementation(
        (args: any) =>
          ({ id: `module-${args.data.order}` }) as any,
      );
      prismaMock.topic.create.mockResolvedValue({ id: 'topic-id' } as any);
      prismaMock.subject.findUnique.mockResolvedValue({
        id: 'subject-id-1',
        name: 'Matemática',
      } as any);
    });

    it('should create subject, modules and topics inside a single transaction', async () => {
      okCourse();
      runTransaction();

      const result = await service.createWithModules(institutionId, dto as any);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.subject.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.module.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.topic.create).toHaveBeenCalledTimes(3);
      expect((result as any).id).toBe('subject-id-1');
    });

    it('should derive Module and Topic order from the array index', async () => {
      okCourse();
      runTransaction();

      await service.createWithModules(institutionId, dto as any);

      // Módulos: order 0, 1
      expect(prismaMock.module.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ order: 0 }) }),
      );
      expect(prismaMock.module.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: expect.objectContaining({ order: 1 }) }),
      );
      // Tópicos do primeiro módulo: order 0, 1
      expect(prismaMock.topic.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: expect.objectContaining({ order: 0 }) }),
      );
      expect(prismaMock.topic.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: expect.objectContaining({ order: 1 }) }),
      );
    });

    it('should rollback (propagate error) when Topic creation fails', async () => {
      okCourse();
      runTransaction();
      prismaMock.topic.create.mockRejectedValue(new Error('db failure'));

      await expect(
        service.createWithModules(institutionId, dto as any),
      ).rejects.toThrow('db failure');
      // A atomicidade é delegada ao $transaction — writes ocorrem dentro dele
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when course belongs to different institution', async () => {
      prismaMock.course.findFirst.mockResolvedValue(null);

      await expect(
        service.createWithModules(institutionId, dto as any),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should scope the course lookup by institution_id from the JWT (not the body)', async () => {
      okCourse();
      runTransaction();

      await service.createWithModules(institutionId, dto as any);

      expect(prismaMock.course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'course-id-1',
            institution_id: institutionId,
          }),
        }),
      );
    });
  });

  describe('findOneWithStructure', () => {
    it('should throw NotFoundException when subject is from another tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null as any);

      await expect(
        service.findOneWithStructure(institutionId, 'subject-id-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should scope the query by institution through the course chain', async () => {
      prismaMock.subject.findFirst.mockResolvedValue({
        id: 'subject-id-1',
        modules: [],
      } as any);

      await service.findOneWithStructure(institutionId, 'subject-id-1');

      expect(prismaMock.subject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'subject-id-1',
            course: { institution_id: institutionId },
          },
        }),
      );
    });
  });

  // Edição da estrutura de uma matéria já existente. Diferente do create:
  // Topic é referenciado por progresso, chat, provas, material e eventos —
  // por isso a remoção é guardada (§12: dados de aluno nunca são destruídos).
  describe('syncStructure', () => {
    const subjectWithStructure = {
      id: 'subject-id-1',
      name: 'Matemática',
      course: { institution_id: institutionId },
      modules: [
        {
          id: 'module-1',
          name: 'Aritmética',
          order: 0,
          topics: [
            { id: 'topic-1', title: 'Números', description: 'a', order: 0 },
            { id: 'topic-2', title: 'Divisibilidad', description: '', order: 1 },
          ],
        },
      ],
    };

    const runTransaction = () =>
      prismaMock.$transaction.mockImplementation(
        async (cb: any) => cb(prismaMock) as any,
      );

    // Nenhum tópico em uso — remoção liberada
    const noTopicUsage = () => {
      prismaMock.topicProgress.count.mockResolvedValue(0 as any);
      prismaMock.conversation.count.mockResolvedValue(0 as any);
      prismaMock.exam.count.mockResolvedValue(0 as any);
      prismaMock.file.count.mockResolvedValue(0 as any);
      prismaMock.event.count.mockResolvedValue(0 as any);
      prismaMock.embedding.count.mockResolvedValue(0 as any);
    };

    beforeEach(() => {
      prismaMock.subject.findFirst.mockResolvedValue(
        subjectWithStructure as any,
      );
      prismaMock.module.create.mockImplementation(
        (args: any) => ({ id: `new-module-${args.data.order}` }) as any,
      );
      prismaMock.topic.create.mockResolvedValue({ id: 'new-topic' } as any);
      prismaMock.module.update.mockResolvedValue({} as any);
      prismaMock.topic.update.mockResolvedValue({} as any);
      prismaMock.topic.delete.mockResolvedValue({} as any);
      prismaMock.module.delete.mockResolvedValue({} as any);
      prismaMock.subject.findUnique.mockResolvedValue(
        subjectWithStructure as any,
      );
      noTopicUsage();
    });

    it('should throw NotFoundException when subject is from another tenant', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null as any);

      await expect(
        service.syncStructure(institutionId, 'subject-id-1', {
          modules: [{ name: 'M', topics: [{ title: 'T' }] }],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update existing topics by id instead of recreating them', async () => {
      runTransaction();

      await service.syncStructure(institutionId, 'subject-id-1', {
        modules: [
          {
            id: 'module-1',
            name: 'Aritmética',
            topics: [
              { id: 'topic-1', title: 'Números naturales', description: 'b' },
              { id: 'topic-2', title: 'Divisibilidad', description: '' },
            ],
          },
        ],
      } as any);

      expect(prismaMock.topic.create).not.toHaveBeenCalled();
      expect(prismaMock.topic.delete).not.toHaveBeenCalled();
      expect(prismaMock.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'topic-1' },
          data: expect.objectContaining({ title: 'Números naturales' }),
        }),
      );
    });

    it('should create topics that come without id', async () => {
      runTransaction();

      await service.syncStructure(institutionId, 'subject-id-1', {
        modules: [
          {
            id: 'module-1',
            name: 'Aritmética',
            topics: [
              { id: 'topic-1', title: 'Números', description: 'a' },
              { id: 'topic-2', title: 'Divisibilidad', description: '' },
              { title: 'Fracciones', description: 'nuevo' },
            ],
          },
        ],
      } as any);

      expect(prismaMock.topic.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Fracciones', order: 2 }),
        }),
      );
    });

    it('should delete topics missing from the payload when they are unused', async () => {
      runTransaction();

      await service.syncStructure(institutionId, 'subject-id-1', {
        modules: [
          {
            id: 'module-1',
            name: 'Aritmética',
            topics: [{ id: 'topic-1', title: 'Números', description: 'a' }],
          },
        ],
      } as any);

      expect(prismaMock.topic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-2' },
      });
    });

    it('should throw ConflictException when a removed topic has student data', async () => {
      runTransaction();
      // topic-2 já foi usado numa conversa
      prismaMock.conversation.count.mockResolvedValue(1 as any);

      await expect(
        service.syncStructure(institutionId, 'subject-id-1', {
          modules: [
            {
              id: 'module-1',
              name: 'Aritmética',
              topics: [{ id: 'topic-1', title: 'Números', description: 'a' }],
            },
          ],
        } as any),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.topic.delete).not.toHaveBeenCalled();
    });

    it('should reject ids that do not belong to the subject (tenant safety)', async () => {
      runTransaction();

      await expect(
        service.syncStructure(institutionId, 'subject-id-1', {
          modules: [
            {
              id: 'module-of-another-subject',
              name: 'Aritmética',
              topics: [{ id: 'topic-1', title: 'Números' }],
            },
          ],
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should recompute order from array index', async () => {
      runTransaction();

      await service.syncStructure(institutionId, 'subject-id-1', {
        modules: [
          {
            id: 'module-1',
            name: 'Aritmética',
            topics: [
              { id: 'topic-2', title: 'Divisibilidad' },
              { id: 'topic-1', title: 'Números' },
            ],
          },
        ],
      } as any);

      expect(prismaMock.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'topic-2' },
          data: expect.objectContaining({ order: 0 }),
        }),
      );
      expect(prismaMock.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'topic-1' },
          data: expect.objectContaining({ order: 1 }),
        }),
      );
    });

    it('should run the whole sync inside a single transaction', async () => {
      runTransaction();

      await service.syncStructure(institutionId, 'subject-id-1', {
        modules: [
          {
            id: 'module-1',
            name: 'Aritmética',
            topics: [{ id: 'topic-1', title: 'Números' }],
          },
        ],
      } as any);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
