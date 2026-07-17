import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Regra inegociável (CLAUDE.md §11): toda chamada à IA gera um registro aqui
export interface RegisterAIUsageInput {
  institution_id: string;
  user_id: string;
  conversation_id?: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  response_tokens: number;
  cost: number;
}

@Injectable()
export class AIUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterAIUsageInput) {
    return this.prisma.aIUsage.create({ data: input });
  }

  // Soma prompt + response tokens do usuário — usado no gate de limite de tokens
  async getTotalUsageByUser(userId: string): Promise<number> {
    const result = await this.prisma.aIUsage.aggregate({
      where: { user_id: userId },
      _sum: { prompt_tokens: true, response_tokens: true },
    });
    return (
      (result._sum.prompt_tokens ?? 0) + (result._sum.response_tokens ?? 0)
    );
  }

  async getTotalUsageByInstitution(institutionId: string): Promise<number> {
    const result = await this.prisma.aIUsage.aggregate({
      where: { institution_id: institutionId },
      _sum: { prompt_tokens: true, response_tokens: true },
    });
    return (
      (result._sum.prompt_tokens ?? 0) + (result._sum.response_tokens ?? 0)
    );
  }

  // Gate de tokens (CLAUDE.md §11): User.ai_token_limit tem prioridade;
  // senão vale o da Institution; sem limite definido em nenhum → liberado
  async hasAvailableTokens(
    userId: string,
    institutionId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user?.ai_token_limit != null) {
      const usage = await this.getTotalUsageByUser(userId);
      return usage < user.ai_token_limit;
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (institution?.ai_token_limit == null) return true;

    const usage = await this.getTotalUsageByInstitution(institutionId);
    return usage < institution.ai_token_limit;
  }

  async findByInstitution(institutionId: string) {
    return this.prisma.aIUsage.findMany({
      where: { institution_id: institutionId },
      orderBy: { created_at: 'desc' },
    });
  }
}
