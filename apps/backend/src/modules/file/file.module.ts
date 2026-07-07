import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { QUEUE_RAG_INGESTION } from '../rag/rag.constants';

@Module({
  imports: [
    // Producer da fila de ingestão — o worker fica no RagModule
    BullModule.registerQueue({ name: QUEUE_RAG_INGESTION }),
    StorageModule,
  ],
  controllers: [FileController],
  providers: [FileService, PrismaService],
  exports: [FileService],
})
export class FileModule {}
