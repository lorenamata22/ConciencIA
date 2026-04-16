import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/exception.filter';

@Module({
  imports: [
    // ConfigModule global — permite uso de ConfigService em qualquer módulo
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global de autenticação — todas as rotas exigem JWT por padrão
    // Rotas públicas usam o decorator @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Interceptor global — formata todas as respostas como { data, message, statusCode }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Filter global — formata todos os erros como { data: null, message, statusCode }
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
