import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appLogger } from './libs/logger/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.useLogger(appLogger);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
