import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Helper para criar mock do PrismaClient em testes unitários
export const createPrismaMock = (): DeepMockProxy<PrismaClient> =>
  mockDeep<PrismaClient>();

export type PrismaMock = DeepMockProxy<PrismaClient>;
