import { Module } from '@nestjs/common';
import { AIUsageService } from './ai-usage.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [AIUsageService, PrismaService],
  exports: [AIUsageService],
})
export class AIUsageModule {}
