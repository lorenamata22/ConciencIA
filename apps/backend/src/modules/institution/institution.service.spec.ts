import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../prisma/prisma-mock';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let prismaMock: PrismaMock;

  const mockInstitution = {
    id: 'inst-id-1',
    name: 'Escola Alpha',
    email: 'contato@alpha.edu',
    phone: null,
    representative_name: 'Maria López',
    address: null,
    postal_code: null,
    country: null,
    city: null,
    logo_url: null,
    status: 'active',
    ai_token_limit: 1000000,
    created_at: new Date(),
  };

  const mockUser = {
    id: 'user-id-1',
    institution_id: 'inst-id-1',
    name: 'Maria López',
    email: 'contato@alpha.edu',
    password: 'hashed',
    user_type: 'institution',
    ai_token_limit: null,
    is_minor: false,
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
    it('should create institution and institution user in a transaction', async () => {
      prismaMock.$transaction.mockImplementation(async (fn: any) =>
        fn(prismaMock),
      );
      prismaMock.institution.create.mockResolvedValue(mockInstitution as any);
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      const result = await service.create({
        name: 'Escola Alpha',
        email: 'contato@alpha.edu',
        password: 'senha123',
        representativeName: 'Maria López',
      });

      expect(result.id).toBe('inst-id-1');
      expect(prismaMock.institution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Escola Alpha', email: 'contato@alpha.edu' }),
        }),
      );
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Maria López',
            email: 'contato@alpha.edu',
            user_type: 'institution',
          }),
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

  describe('getStats', () => {
    it('should return institution counts grouped by status', async () => {
      prismaMock.institution.count
        .mockResolvedValueOnce(5)  // total
        .mockResolvedValueOnce(3)  // active
        .mockResolvedValueOnce(1)  // pending
        .mockResolvedValueOnce(2); // newThisMonth

      const result = await service.getStats();

      expect(result).toEqual({ total: 5, active: 3, pending: 1, newThisMonth: 2 });
      expect(prismaMock.institution.count).toHaveBeenCalledTimes(4);
    });
  });
});
