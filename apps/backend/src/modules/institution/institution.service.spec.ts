import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let prismaMock: PrismaMock;

  const mockInstitution = {
    id: 'inst-id-1',
    name: 'Escola Alpha',
    status: 'active',
    ai_token_limit: 1000000,
    created_at: new Date(),
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<InstitutionService>(InstitutionService);
  });

  describe('create', () => {
    it('should create a new institution', async () => {
      prismaMock.institution.create.mockResolvedValue(mockInstitution as any);

      const result = await service.create({ name: 'Escola Alpha', ai_token_limit: 1000000 });

      expect(result.id).toBe('inst-id-1');
      expect(prismaMock.institution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Escola Alpha' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return institution by id', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);

      const result = await service.findOne('inst-id-1');
      expect(result.name).toBe('Escola Alpha');
    });

    it('should throw NotFoundException when institution does not exist', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update institution', async () => {
      const updated = { ...mockInstitution, name: 'Escola Beta' };
      prismaMock.institution.update.mockResolvedValue(updated as any);

      const result = await service.update('inst-id-1', { name: 'Escola Beta' });
      expect(result.name).toBe('Escola Beta');
    });
  });

  describe('findAll', () => {
    it('should return list of all institutions (super_admin only)', async () => {
      prismaMock.institution.findMany.mockResolvedValue([mockInstitution] as any);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });
});
