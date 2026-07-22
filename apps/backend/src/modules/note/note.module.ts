import { Module } from '@nestjs/common';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [NoteController],
  providers: [NoteService, PrismaService],
  exports: [NoteService],
})
export class NoteModule {}
