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
import { DecimalInterceptor } from './common/decimal.interceptor';
import { ErrosGlobaisFilter } from './common/erros-globais.filter';
import { origensCors } from './cors';

const ORIGENS_CORS = origensCors();

/**
 * Publica a documentação interativa em /docs (UI) e /docs-json (OpenAPI).
 *
 * Em produção ela fica desligada por padrão: a UI é pública e revela a
 * existência de todos os endpoints e o formato dos payloads. Para ligar em
 * produção (não recomendado), defina DOCS_HABILITADOS=true; para desligar em
 * desenvolvimento, DOCS_HABILITADOS=false.
 */
function publicarDocumentacao(app: NestExpressApplication): void {
  const configurado = process.env.DOCS_HABILITADOS?.toLowerCase();
  const emProducao = process.env.NODE_ENV === 'production';
  const desligadoExplicitamente = configurado === 'false';
  const ligadoExplicitamente = configurado === 'true';

  if (desligadoExplicitamente || (emProducao && !ligadoExplicitamente)) {
    console.log(
      'Documentação da API desabilitada' +
        (emProducao && !ligadoExplicitamente
          ? ' (padrão em produção; DOCS_HABILITADOS=true para forçar).'
          : ' (DOCS_HABILITADOS=false).'),
    );
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

  // Os campos monetários são `Decimal` no banco; sem esta normalização sairiam
  // como string no JSON ("25.9") e quebrariam as somas do frontend.
  app.useGlobalInterceptors(new DecimalInterceptor());

  // Habilita o CORS para aceitar chamadas do Angular (origens configuráveis)
  app.enableCors({
    origin: ORIGENS_CORS,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Atrás de proxy/reverse proxy, o ThrottlerGuard (que usa `req.ip`) precisa
  // enxergar o IP real: sem isto, todo cliente passa a compartilhar o mesmo
  // contador de rate-limit e o lockout de login bloqueia o IP do proxy para
  // todos. Só ligue quando houver um proxy que preenche X-Forwarded-For de
  // forma confiável (o mesmo valor de CONFIAR_PROXY usado pelo login).
  if (process.env.CONFIAR_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // Respostas de erro padronizadas em pt-BR
  app.useGlobalFilters(new ErrosGlobaisFilter());

  // Documentação da API (depois dos pipes/filtros, para refleti-los)
  publicarDocumentacao(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
