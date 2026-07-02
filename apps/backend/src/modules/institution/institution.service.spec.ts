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
      prismaMock.institution.findUnique.mockResolvedValue(mockInstitution as any);
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

  describe('getUsers', () => {
    it('should map access_code to pendingActivation without exposing the code', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(
        mockInstitution as any,
      );
      prismaMock.user.findMany.mockResolvedValue([
        { ...mockUser, access_code: 'ABCD2345' },
        { ...mockUser, id: 'user-id-2', access_code: null },
      ] as any);

      const result = await service.getUsers('inst-id-1');

      expect(result[0].pendingActivation).toBe(true);
      expect(result[1].pendingActivation).toBe(false);
      expect(result[0]).not.toHaveProperty('access_code');
    });

    it('should throw NotFoundException when institution does not exist', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);

      await expect(service.getUsers('missing')).rejects.toThrow(
        NotFoundException,
      );
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

  describe('deleteUser', () => {
    beforeEach(() => {
      prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
      prismaMock.conversation.findMany.mockResolvedValue([] as any);
    });

    it('should delete password reset tokens and AI usage before deleting user', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        ...mockUser,
        teacher: null,
        student: null,
      } as any);

      await service.deleteUser('inst-id-1', 'user-id-1');

      expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-id-1' },
      });
      expect(prismaMock.aIUsage.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-id-1' },
      });
      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'user-id-1' } });
    });

    it('should delete conversations with messages and summaries before deleting student', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        ...mockUser,
        teacher: null,
        student: { id: 'student-id-1' },
      } as any);
      prismaMock.conversation.findMany.mockResolvedValue([
        { id: 'conv-1' },
        { id: 'conv-2' },
      ] as any);

      await service.deleteUser('inst-id-1', 'user-id-1');

      expect(prismaMock.message.deleteMany).toHaveBeenCalledWith({
        where: { conversation_id: { in: ['conv-1', 'conv-2'] } },
      });
      expect(prismaMock.conversationSummary.deleteMany).toHaveBeenCalledWith({
        where: { conversation_id: { in: ['conv-1', 'conv-2'] } },
      });
      expect(prismaMock.conversation.deleteMany).toHaveBeenCalledWith({
        where: { student_id: 'student-id-1' },
      });
      expect(prismaMock.alert.deleteMany).toHaveBeenCalledWith({
        where: { student_id: 'student-id-1' },
      });
      expect(prismaMock.student.delete).toHaveBeenCalledWith({
        where: { id: 'student-id-1' },
      });
    });

    it('should throw NotFoundException when user does not belong to institution', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.deleteUser('inst-id-1', 'user-outro')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
