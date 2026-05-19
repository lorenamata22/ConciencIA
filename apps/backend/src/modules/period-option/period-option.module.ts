import { Module } from '@nestjs/common';
import { PeriodOptionController } from './period-option.controller';
import { PeriodOptionService } from './period-option.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PeriodOptionController],
  providers: [PeriodOptionService, PrismaService],
  exports: [PeriodOptionService],
})
export class PeriodOptionModule {}
