import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { RagModule } from '../rag/rag.module';
import { AIUsageModule } from '../ai-usage/ai-usage.module';
import { ConversationModule } from '../conversation/conversation.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    AIProviderModule,
    RagModule,
    AIUsageModule,
    ConversationModule,
    MessageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
