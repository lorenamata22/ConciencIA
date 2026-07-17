import { Module } from '@nestjs/common';
import { TopicProgressService } from './topic-progress.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [TopicProgressService, PrismaService],
  exports: [TopicProgressService],
})
export class TopicProgressModule {}
