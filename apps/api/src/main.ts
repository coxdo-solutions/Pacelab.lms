// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    // buffer logs to avoid noisy output in dev if you have interceptors
    // logger: ['error', 'warn', 'log'],
  });

  // If you're behind a proxy (Render, Nginx, Cloudflare, etc.)
  // this is required so `secure` cookies and client IP work properly.
  // (Express only)
  // @ts-ignore
  app.set('trust proxy', 1);

  // Security headers (relaxed CSP in dev)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Body limits (adjust if you upload large files)
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  // Gzip
  app.use(compression());

  // Cookies
  app.use(cookieParser());

  // --- CORS (critical for cookies + Next.js) ---
  // Allow a single FRONTEND_URL or a small allowlist.
  const allowlist = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // allow mobile apps / curl / SSR with no origin
      if (!origin) return callback(null, true);
      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // (Optional) If you want your API under /api
  // app.setGlobalPrefix('api', { exclude: [''] });

  // Swagger (Bearer + Cookie auth)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PaceLab LMS API')
    .setDescription('API documentation for the LMS backend')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .addCookieAuth('token', {
      type: 'apiKey',
      in: 'cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdowns (for containers)
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 LMS Backend running on http://localhost:${port}`);
  logger.log(`📚 Swagger Docs at http://localhost:${port}/api/docs`);
}
bootstrap();

