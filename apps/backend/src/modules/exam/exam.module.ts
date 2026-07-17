import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { RagModule } from '../rag/rag.module';
import { AIUsageModule } from '../ai-usage/ai-usage.module';
import { TopicProgressModule } from '../topic-progress/topic-progress.module';
import { StudentMetricsModule } from '../student-metrics/student-metrics.module';

@Module({
  imports: [
    AIProviderModule,
    RagModule,
    AIUsageModule,
    TopicProgressModule,
    StudentMetricsModule,
  ],
  controllers: [ExamController],
  providers: [ExamService, PrismaService],
  exports: [ExamService],
})
export class ExamModule {}
