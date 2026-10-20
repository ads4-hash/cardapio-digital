import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ErrosGlobaisFilter } from '../src/common/erros-globais.filter';

/**
 * e2e do backend: sobe o AppModule inteiro em um servidor HTTP real (supertest)
 * e exercita o que a configuração do `main.ts` garante — roteamento, pipe de
 * validação global e filtro de erros. O `PrismaService` é substituído por um
 * stub para o teste não depender de um banco, mas todos os módulos, guards e
 * filtros reais continuam sendo montados.
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  const prisma = {
    $queryRaw: jest.fn(),
    onModuleInit: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ErrosGlobaisFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde 200 quando o banco responde', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /health responde 503 quando o banco está indisponível', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('sem banco'));

    await request(app.getHttpServer()).get('/health').expect(503);
  });

  it('POST /auth/login rejeita corpo fora do contrato com 400', async () => {
    // Corpo vazio: o ValidationPipe global barra antes de tocar no serviço.
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('POST /auth/login rejeita campos não permitidos no corpo', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', senha: 'segredo123', extra: 'nao-permitido' })
      .expect(400);
  });
});
