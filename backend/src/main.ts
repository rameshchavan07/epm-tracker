import 'dotenv/config';
import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  // Security: HTTP headers hardening
  app.use(helmet());

  // Increase payload limit for base64 face enrollments/verifications
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Validation: strip unknown properties, auto-transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global logging interceptor for request timing
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS: restrict to known origins in production
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Graceful shutdown: close DB connections, etc.
  app.enableShutdownHooks();

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('EPM Tracker API')
    .setDescription('Enterprise Field Telemetry & Biometric Workforce Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`EPM Tracker API running on http://0.0.0.0:${port}`);
  logger.log(`Swagger docs available at http://0.0.0.0:${port}/api/docs`);
}
void bootstrap();
