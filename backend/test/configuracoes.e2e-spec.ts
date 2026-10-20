import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminDeTeste, criarAdmin, montarAppE2E } from './utilitarios/app-e2e';

/**
 * e2e da configuração de pagamento Pix: o cliente lê os dados públicos por
 * slug (padrão null sem cadastro), o admin grava via PATCH autenticado, o
 * GET público reflete na hora e um token de outro estabelecimento não
 * consegue mexer nos dados da casa alheia.
 */
describe('Configurações Pix (e2e)', () => {
  let app: INestApplication;
  let adminA: AdminDeTeste;
  let adminB: AdminDeTeste;

  beforeAll(async () => {
    app = await montarAppE2E();
    adminA = await criarAdmin(app, 'Casa Pix A');
    adminB = await criarAdmin(app, 'Casa Pix B');
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem cadastro devolve todos os campos null (GET público)', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminA.slug })
      .expect(200);

    expect(resposta.body).toEqual({
      tipoChave: null,
      chave: null,
      titular: null,
      instituicao: null,
      qrUrl: null,
    });
  });

  it('exige slug no GET público', async () => {
    await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .expect(400);
  });

  it('PATCH sem token é 401', async () => {
    await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .send({ chave: 'nao@deve.passar' })
      .expect(401);
  });

  it('rejeita tipo de chave inválido (validação do DTO)', async () => {
    const resposta = await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ tipoChave: 'BITCOIN' })
      .expect(400);

    expect(resposta.body.mensagem).toEqual(
      expect.arrayContaining([
        expect.stringContaining('tipo de chave PIX válido'),
      ]),
    );
  });

  it('admin grava os dados e o GET público reflete', async () => {
    const salvo = await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        tipoChave: 'CPF',
        chave: '123.456.789-00',
        titular: 'Maria da Silva',
        instituicao: 'Nubank',
        qrUrl: '/uploads/est-a/qr.png',
      })
      .expect(200);

    expect(salvo.body).toEqual({
      tipoChave: 'CPF',
      chave: '123.456.789-00',
      titular: 'Maria da Silva',
      instituicao: 'Nubank',
      qrUrl: '/uploads/est-a/qr.png',
    });

    const publico = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminA.slug })
      .expect(200);
    expect(publico.body.chave).toBe('123.456.789-00');
  });

  it('PATCH parcial preserva os campos não enviados', async () => {
    await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ titular: 'Maria S.' })
      .expect(200);

    const publico = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminA.slug })
      .expect(200);
    expect(publico.body).toMatchObject({
      tipoChave: 'CPF',
      chave: '123.456.789-00',
      titular: 'Maria S.',
    });
  });

  it('token de outro estabelecimento não altera os dados da casa A', async () => {
    await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .set('Authorization', `Bearer ${adminB.token}`)
      .send({ chave: 'chave-da-casa-b', tipoChave: 'EMAIL' })
      .expect(200);

    const publicoA = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminA.slug })
      .expect(200);
    expect(publicoA.body.chave).toBe('123.456.789-00');

    const publicoB = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminB.slug })
      .expect(200);
    expect(publicoB.body.chave).toBe('chave-da-casa-b');
  });

  it('null limpa o campo e o público volta a null', async () => {
    await request(app.getHttpServer())
      .patch('/configuracoes/pix')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ qrUrl: null })
      .expect(200);

    const publico = await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: adminA.slug })
      .expect(200);
    expect(publico.body.qrUrl).toBeNull();
    expect(publico.body.chave).toBe('123.456.789-00');
  });

  it('slug desconhecido é 404', async () => {
    await request(app.getHttpServer())
      .get('/configuracoes/pix')
      .query({ slug: 'nao-existe-mesmo' })
      .expect(404);
  });
});
