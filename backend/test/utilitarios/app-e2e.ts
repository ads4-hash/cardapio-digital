import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DecimalInterceptor } from '../../src/common/decimal.interceptor';
import { ErrosGlobaisFilter } from '../../src/common/erros-globais.filter';

/**
 * Sobe o AppModule com as mesmas camadas globais do main.ts (ValidationPipe,
 * DecimalInterceptor, ErrosGlobaisFilter e cookie-parser — este último é o que
 * permite exercitar o fluxo de refresh por cookie nos e2e).
 *
 * Diferente do app.e2e-spec (que testa a configuração com Prisma/JWT
 * stubados), os specs de fluxo usam o banco SQLite de teste e o JWT real —
 * o `@nestjs/jwt` é substituído pelo shim CJS de test/shims, que assina e
 * verifica de verdade.
 */
export async function montarAppE2E(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = modulo.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new DecimalInterceptor());
  app.useGlobalFilters(new ErrosGlobaisFilter());
  await app.init();
  return app;
}

/** Extrai o valor do cookie refresh_token de uma resposta HTTP. */
export function lerCookieRefresh(resposta: {
  headers: Record<string, unknown>;
}): string | undefined {
  const bruto = resposta.headers['set-cookie'];
  const lista = Array.isArray(bruto)
    ? bruto
    : typeof bruto === 'string'
      ? [bruto]
      : [];
  const cookie = lista.find((c) => c.startsWith('refresh_token='));
  return cookie?.split(';')[0]?.split('=')[1];
}

/** Administrador de teste: registra uma casa nova e devolve a sessão. */
export interface AdminDeTeste {
  token: string;
  refresh: string;
  usuarioId: string;
  estabelecimentoId: string;
  slug: string;
  email: string;
}

export async function criarAdmin(
  app: INestApplication,
  nomeEstabelecimento: string,
): Promise<AdminDeTeste> {
  const sufixo = randomUUID().slice(0, 8);
  const email = `admin-${sufixo}@teste.dev`;
  const senha = 'senha123';

  const resposta = await request(app.getHttpServer())
    .post('/auth/registrar')
    .send({
      nomeEstabelecimento: `${nomeEstabelecimento} ${sufixo}`,
      nome: 'Administrador',
      email,
      senha,
      confirmarSenha: senha,
      telefone: '(11) 98888-7777',
    })
    .expect(201);

  const refresh = lerCookieRefresh(resposta);
  if (!refresh) {
    throw new Error('POST /auth/registrar não devolveu o cookie de refresh.');
  }

  return {
    token: resposta.body.token,
    refresh,
    usuarioId: resposta.body.usuario.id,
    estabelecimentoId: resposta.body.usuario.estabelecimento.id,
    slug: resposta.body.usuario.estabelecimento.slug,
    email,
  };
}
