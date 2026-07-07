import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RagService } from './rag.service';
import { RagIngestionProcessor } from './rag-ingestion.processor';
import { QUEUE_RAG_INGESTION } from './rag.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_RAG_INGESTION }),
    AIProviderModule,
    StorageModule,
  ],
  providers: [RagService, RagIngestionProcessor, PrismaService],
  exports: [RagService],
})
export class RagModule {}
