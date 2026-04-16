import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GradeService } from './grade.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('GradeService', () => {
  let service: GradeService;
  let prismaMock: PrismaMock;

  const institutionId = 'inst-id-1';

  const mockTemplate = {
    id: 'template-id-1',
    institution_id: institutionId,
    name: 'Boletim 2026',
    created_at: new Date(),
  };

  const mockColumn = {
    id: 'col-id-1',
    template_id: 'template-id-1',
    group_name: 'Bimestre 1',
    column_name: 'Prova 1',
    grade_type: 'number',
    weight: 1.0,
    auto_average: false,
  };

  const mockStudentGrade = {
    id: 'grade-id-1',
    student_id: 'student-id-1',
    column_id: 'col-id-1',
    value: '8.5',
    updated_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GradeService>(GradeService);
  });

  describe('createTemplate', () => {
    it('should create grade template with institution_id', async () => {
      prismaMock.gradeTemplate.create.mockResolvedValue(mockTemplate as any);

      const result = await service.createTemplate(
        { name: 'Boletim 2026' },
        institutionId,
      );

      expect(prismaMock.gradeTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });

  describe('addColumn', () => {
    it('should add column to template from same institution', async () => {
      prismaMock.gradeTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.gradeColumn.create.mockResolvedValue(mockColumn as any);

      const result = await service.addColumn('template-id-1', {
        group_name: 'Bimestre 1',
        column_name: 'Prova 1',
        grade_type: 'number',
        weight: 1.0,
        auto_average: false,
      }, institutionId);

      expect(result.id).toBe('col-id-1');
    });

    it('should throw ForbiddenException when template belongs to different institution', async () => {
      prismaMock.gradeTemplate.findUnique.mockResolvedValue({
        ...mockTemplate,
        institution_id: 'outro-inst',
      } as any);

      await expect(
        service.addColumn('template-id-1', {
          group_name: 'Bimestre 1',
          column_name: 'Prova 1',
          grade_type: 'number',
          weight: 1.0,
          auto_average: false,
        }, institutionId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setGrade', () => {
    it('should upsert student grade (teacher fills it)', async () => {
      prismaMock.studentGrade.upsert.mockResolvedValue(mockStudentGrade as any);

      const result = await service.setGrade(
        'student-id-1',
        'col-id-1',
        '8.5',
      );

      expect(result.value).toBe('8.5');
      expect(prismaMock.studentGrade.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            student_id_column_id: { student_id: 'student-id-1', column_id: 'col-id-1' },
          }),
        }),
      );
    });
  });

  describe('getStudentGrades', () => {
    it('should return grades for a student filtered by template', async () => {
      prismaMock.studentGrade.findMany.mockResolvedValue([mockStudentGrade] as any);

      const result = await service.getStudentGrades('student-id-1', 'template-id-1');

      expect(result).toHaveLength(1);
      expect(prismaMock.studentGrade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ student_id: 'student-id-1' }),
        }),
      );
    });
  });

  describe('getTemplatesByInstitution', () => {
    it('should return templates filtered by institution_id', async () => {
      prismaMock.gradeTemplate.findMany.mockResolvedValue([mockTemplate] as any);

      await service.getTemplatesByInstitution(institutionId);

      expect(prismaMock.gradeTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
        }),
      );
    });
  });
});
