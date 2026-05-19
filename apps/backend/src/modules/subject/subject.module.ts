import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SubjectController],
  providers: [SubjectService, PrismaService],
  exports: [SubjectService],
})
export class SubjectModule {}
