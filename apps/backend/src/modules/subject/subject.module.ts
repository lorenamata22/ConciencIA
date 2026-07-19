import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { ProgramParseService } from './program-parse.service';
import { RagCoverageService } from './rag-coverage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { AIUsageModule } from '../ai-usage/ai-usage.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [AIProviderModule, AIUsageModule, RagModule],
  controllers: [SubjectController],
  providers: [
    SubjectService,
    ProgramParseService,
    RagCoverageService,
    PrismaService,
  ],
  exports: [SubjectService],
})
export class SubjectModule {}
