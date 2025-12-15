import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.useLogger(appLogger);
   app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
