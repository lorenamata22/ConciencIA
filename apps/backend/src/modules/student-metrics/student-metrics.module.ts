import { Module } from '@nestjs/common';
import { StudentMetricsService } from './student-metrics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [StudentMetricsService, PrismaService],
  exports: [StudentMetricsService],
})
export class StudentMetricsModule {}
