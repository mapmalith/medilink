import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true makes the raw request buffer available as req.rawBody.
  // Stripe webhook signature verification requires the unmodified bytes.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());

  // Trust X-Forwarded-For so ThrottlerGuard sees the real client IP behind
  // a reverse proxy (e.g. nginx, Cloudflare).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Twilio sends webhook data as application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));
  const configService = app.get(ConfigService);

  const port = configService.get<number>('API_PORT', 3001);
  const prefix = configService.get<string>('API_PREFIX', '/api/v1');

  app.setGlobalPrefix(prefix);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}${prefix}`);
}

bootstrap();
