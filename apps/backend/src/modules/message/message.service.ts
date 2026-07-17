import { Injectable } from '@nestjs/common';
import { MessageRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateMessageInput {
  conversation_id: string;
  role: MessageRole;
  content: string;
  prompt_tokens: number;
  response_tokens: number;
}

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMessageInput) {
    return this.prisma.message.create({ data: input });
  }

  async findByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
  }

  // Últimas N mensagens (mais recentes primeiro) — contexto de histórico do chat
  async getLastN(conversationId: string, n: number) {
    return this.prisma.message.findMany({
      where: { conversation_id: conversationId },
      take: n,
      orderBy: { created_at: 'desc' },
    });
  }
}
