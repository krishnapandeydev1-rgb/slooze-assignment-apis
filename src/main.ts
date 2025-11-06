import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  // ✅ Enable CORS so frontend (Next.js at http://localhost:3000) can call the backend
  app.enableCors({
    origin: 'http://localhost:3000', // Adjust if you deploy
    credentials: true, // optional: if you’re using cookies/session-based auth
  });

  // ✅ Use Nest’s global validation system
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips out fields not in DTOs
      forbidNonWhitelisted: true, // throws error if extra fields are present
      transform: true, // automatically transforms payloads to DTO classes
    }),
  );

  // ✅ Start the app
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
