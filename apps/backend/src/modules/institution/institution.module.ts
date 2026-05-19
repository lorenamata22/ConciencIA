import { Module } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { InstitutionController } from './institution.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [InstitutionController],
  providers: [InstitutionService, PrismaService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
