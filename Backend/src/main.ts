import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validationPipe } from './common/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Behind a reverse proxy, the client's address (for the activity log) comes from it
  if (config.get<string>('TRUST_PROXY') === 'true') app.set('trust proxy', 1);

  // The dashboard calls every endpoint as `VITE_API + "<name>"`, so the prefix
  // has to end with a slash on the client side: http://localhost:3000/api/
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173').split(','),
    credentials: true,
  });

  app.useGlobalPipes(validationPipe);
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  Logger.log(`API ready on http://localhost:${port}/api/`, 'Bootstrap');
}

bootstrap();
