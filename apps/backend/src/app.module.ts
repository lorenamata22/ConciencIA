import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { CourseModule } from './modules/course/course.module';
import { SubjectModule } from './modules/subject/subject.module';
import { CourseModuleModule } from './modules/course-module/course-module.module';
import { TopicModule } from './modules/topic/topic.module';
import { ClassModule } from './modules/class/class.module';
import { PeriodOptionModule } from './modules/period-option/period-option.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { StudentModule } from './modules/student/student.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TaskModule } from './modules/task/task.module';
import { DriveModule } from './modules/drive/drive.module';
import { AIProviderModule } from './modules/ai-provider/ai-provider.module';
import { FileModule } from './modules/file/file.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MessageModule } from './modules/message/message.module';
import { AIUsageModule } from './modules/ai-usage/ai-usage.module';
import { ExamModule } from './modules/exam/exam.module';
import { TopicProgressModule } from './modules/topic-progress/topic-progress.module';
import { StudentMetricsModule } from './modules/student-metrics/student-metrics.module';
import { NoteModule } from './modules/note/note.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Conexão Redis compartilhada por todas as filas BullMQ
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        );
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            ...(redisUrl.password ? { password: redisUrl.password } : {}),
          },
        };
      },
    }),
    AuthModule,
    InstitutionModule,
    CourseModule,
    SubjectModule,
    CourseModuleModule,
    TopicModule,
    ClassModule,
    PeriodOptionModule,
    TeacherModule,
    StudentModule,
    CalendarModule,
    TaskModule,
    DriveModule,
    AIProviderModule,
    FileModule,
    RagModule,
    ChatModule,
    ConversationModule,
    MessageModule,
    AIUsageModule,
    ExamModule,
    TopicProgressModule,
    NoteModule,
    StudentMetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
