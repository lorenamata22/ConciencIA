import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [ClassController],
  providers: [ClassService, PrismaService],
  exports: [ClassService],
})
export class ClassModule {}
