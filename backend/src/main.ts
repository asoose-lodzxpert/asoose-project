import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(appLogger);
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: 'http://localhost:3000', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
  console.log(`Backend is running on: ${await app.getUrl()}`);
}
bootstrap();