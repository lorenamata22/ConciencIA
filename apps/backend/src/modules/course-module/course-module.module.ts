import { Module } from '@nestjs/common';
import { CourseModuleController } from './course-module.controller';
import { CourseModuleService } from './course-module.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [CourseModuleController],
  providers: [CourseModuleService, PrismaService],
  exports: [CourseModuleService],
})
export class CourseModuleModule {}
