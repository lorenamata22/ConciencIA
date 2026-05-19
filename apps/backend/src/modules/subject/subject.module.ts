import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [SubjectController],
  providers: [SubjectService, PrismaService],
  exports: [SubjectService],
})
export class SubjectModule {}
