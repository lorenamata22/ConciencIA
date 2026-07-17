import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [ConversationService, PrismaService],
  exports: [ConversationService],
})
export class ConversationModule {}
