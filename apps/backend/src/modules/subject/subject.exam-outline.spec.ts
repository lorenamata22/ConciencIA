import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubjectService } from './subject.service';

describe('SubjectService exam outline', () => {
  let service: SubjectService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = module.get(SubjectService);
  });

  it('should return modules with ordered topics for a subject available to the student', async () => {
    const modules = [
      {
        id: 'module-1',
        name: 'Módulo 1',
        topics: [
          {
            id: 'topic-1',
            title: 'Derivadas',
            description: null,
            order: 1,
          },
        ],
      },
    ];
    prisma.subject.findFirst.mockResolvedValue({ modules } as never);

    await expect(
      service.getExamOutlineForStudent('user-1', 'subject-1'),
    ).resolves.toEqual(modules);
    expect(prisma.subject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'subject-1',
          course: expect.objectContaining({
            classes: expect.objectContaining({
              some: expect.objectContaining({
                studentClasses: expect.objectContaining({
                  some: { student: { user_id: 'user-1' } },
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('should reject a subject that is not available to the student', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.getExamOutlineForStudent('user-1', 'subject-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
