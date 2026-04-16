import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — permite requisições do frontend Next.js
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Pipe global de validação — usa class-validator nos DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // remove campos não declarados no DTO
      forbidNonWhitelisted: true,
      transform: true,       // converte tipos automaticamente
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('BACKEND_PORT') ?? 3001;

  await app.listen(port);
}
bootstrap();
