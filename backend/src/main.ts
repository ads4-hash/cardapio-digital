// Carrega as variáveis de ambiente do .env antes de qualquer módulo do Nest
import 'dotenv/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { AppModule } from './app.module';
import { ErrosGlobaisFilter } from './common/erros-globais.filter';

// Origens permitidas no CORS (separadas por vírgula no .env)
const ORIGENS_CORS: string | string[] = process.env.CORS_ORIGIN?.split(',').map(
  (o) => o.trim(),
) ?? ['http://localhost:4200'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Garante que a pasta de uploads existe antes de servir/gravar arquivos
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve arquivos estáticos da pasta uploads (imagens enviadas pelo admin)
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    maxAge: '7d',
    setHeaders: (res: Response) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  // Headers de segurança (Helmet). O crossOriginResourcePolicy é liberado para
  // que o frontend (outra origem) possa carregar as imagens de /uploads
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Validação global dos DTOs (rejeita campos extras e transforma payloads)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Habilita o CORS para aceitar chamadas do Angular (origens configuráveis)
  app.enableCors({
    origin: ORIGENS_CORS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Respostas de erro padronizadas em pt-BR
  app.useGlobalFilters(new ErrosGlobaisFilter());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
