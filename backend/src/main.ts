// Carrega as variáveis de ambiente do .env antes de qualquer módulo do Nest
import 'dotenv/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { AppModule } from './app.module';
import { ErrosGlobaisFilter } from './common/erros-globais.filter';

// 4200 = `ng serve` em desenvolvimento; 4000 = servidor SSR empacotado pelo Docker
const ORIGENS_CORS_PADRAO = ['http://localhost:4200', 'http://localhost:4000'];

// Origens permitidas no CORS (separadas por vírgula no .env)
const ORIGENS_CORS: string | string[] =
  process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ??
  ORIGENS_CORS_PADRAO;

/**
 * Publica a documentação interativa em /docs (UI) e /docs-json (OpenAPI).
 *
 * A UI fica disponível para qualquer visitante, então em produção é costume
 * desligá-la com DOCS_HABILITADOS=false — ela revela a existência de todos os
 * endpoints e o formato dos payloads.
 */
function publicarDocumentacao(app: NestExpressApplication): void {
  if (process.env.DOCS_HABILITADOS?.toLowerCase() === 'false') {
    console.log('Documentação da API desabilitada (DOCS_HABILITADOS=false).');
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Cardápio Digital — API')
    .setDescription(
      [
        'API do sistema de cardápio digital com pedidos em tempo real.',
        '',
        '**Multi-tenant.** Cada administrador pertence a um estabelecimento, identificado',
        'pelo `slug` na URL pública do cardápio (`/cardapio/:slug`). Os endpoints',
        'públicos recebem `?slug=` para saber de qual cardápio se trata; os endpoints',
        'de painel usam sempre o estabelecimento do token, e nunca o do parâmetro.',
        '',
        '**Autenticação.** `POST /auth/login` devolve um token JWT para ser enviado como',
        '`Authorization: Bearer <token>`. Use o botão **Authorize** acima para testar os',
        'endpoints de painel.',
        '',
        '**Erros.** Toda resposta de erro tem o mesmo formato (`statusCode`, `erro`,',
        '`mensagem`, `caminho`, `timestamp`), com a mensagem em português.',
        '',
        '**Rate limit.** 100 requisições/min por IP em toda a API, com limites mais',
        'estritos nos endpoints sensíveis: `POST /auth/login` (10/min),',
        '`POST /auth/registrar`, `/auth/recuperar-senha` e `/auth/redefinir-senha`',
        '(5/min) e `POST /pedidos` (20/min). O login ainda bloqueia por 15 min após',
        '5 falhas do mesmo IP ou 10 do mesmo e-mail.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token devolvido por POST /auth/login',
      },
      'bearer',
    )
    .addTag('auth', 'Cadastro, login, sessão e recuperação de senha')
    .addTag('categorias', 'Categorias do cardápio')
    .addTag('produtos', 'Produtos e ingredientes personalizáveis')
    .addTag('ingredientes', 'Ingredientes disponíveis para personalização')
    .addTag('pedidos', 'Pedidos do cliente e gestão no painel')
    .addTag('configuracoes', 'Estado online/offline, taxa de entrega e visual')
    .addTag('upload', 'Envio de imagens dos produtos')
    .build();

  const documento = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documento, {
    customSiteTitle: 'Cardápio Digital — API',
    swaggerOptions: {
      // Mantém o token entre reloads da página ao usar o Authorize
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      displayRequestDuration: true,
    },
  });

  console.log('Documentação da API: /docs (UI) e /docs-json (OpenAPI)');
}

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

  // Documentação da API (depois dos pipes/filtros, para refleti-los)
  publicarDocumentacao(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
