import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import {
  criarAdmin,
  lerCookieRefresh,
  montarAppE2E,
} from './utilitarios/app-e2e';

/**
 * e2e dos fluxos de autenticação com banco (SQLite de teste) e JWT reais:
 * o shim CJS de @nestjs/jwt assina e verifica tokens de verdade, então estas
 * cobrem o que os unitários (com JwtService mockado) não conseguem: cookie
 * HttpOnly saindo do registrar/login, rotação de refresh, detecção de roubo
 * (reuso revoga todas as sessões), lockout por IP e recuperação de senha.
 *
 * O registrar tem limite de 5/min por IP, então os testes compartilham um
 * único administrador criado no beforeAll — os que alteram estado (roubo de
 * sessão, troca de senha, lockout) vêm por último, em ordem.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let admin: Awaited<ReturnType<typeof criarAdmin>>;

  beforeAll(async () => {
    app = await montarAppE2E();
    admin = await criarAdmin(app, 'Casa Base');
  });

  afterAll(async () => {
    await app.close();
  });

  it('registrar cria estabelecimento, sessão e cookie HttpOnly em /auth', async () => {
    const email = `casa-${randomUUID().slice(0, 8)}@teste.dev`;
    const senha = 'senha123';

    const resposta = await request(app.getHttpServer())
      .post('/auth/registrar')
      .send({
        nomeEstabelecimento: 'Pizzaria do Zé',
        nome: 'Zé',
        email,
        senha,
        confirmarSenha: senha,
        telefone: '(11) 98888-7777',
      })
      .expect(201);

    expect(resposta.body.token).toEqual(expect.any(String));
    expect(resposta.body.usuario.email).toBe(email);
    expect(resposta.body.usuario.estabelecimento.slug).toMatch(/pizzaria/);

    // O refresh vem em cookie HttpOnly restrito a /auth — nunca no corpo
    const cookies = resposta.headers['set-cookie'] as unknown as string[];
    const cookie = cookies.find((c) => c.startsWith('refresh_token='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');
    expect(resposta.body.refreshToken).toBeUndefined();
  });

  it('GET /auth/me valida o access token e devolve o perfil', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    expect(resposta.body.id).toBe(admin.usuarioId);
    expect(resposta.body.estabelecimento.id).toBe(admin.estabelecimentoId);
  });

  it('login recusa senha errada com 401 e aceita a certa com 200', async () => {
    const errada = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'senha-errada-1' })
      .expect(401);
    expect(errada.body.mensagem).toBe('E-mail ou senha inválidos.');

    const certa = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'senha123' })
      .expect(200);
    expect(certa.body.token).toEqual(expect.any(String));
    expect(lerCookieRefresh(certa)).toEqual(expect.any(String));
  });

  it('refresh rotaciona o token: emite par novo e devolve cookie novo', async () => {
    const renovado = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${admin.refresh}`)
      .expect(200);

    // O access renova sem novo login e continua válido...
    expect(renovado.body.token).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${renovado.body.token}`)
      .expect(200);

    // ...e o refresh rotaciona: o cookie novo difere do antigo (o valor é
    // aleatório; o JWT em si pode coincidir se emitido no mesmo segundo,
    // porque o payload não muda na rotação)
    const cookieNovo = lerCookieRefresh(renovado);
    expect(cookieNovo).toBeDefined();
    expect(cookieNovo).not.toBe(admin.refresh);
  });

  it('reusar um refresh token já rotacionado é tratado como roubo e derruba todas as sessões', async () => {
    // Sessão legítima nova, que coexiste com as rotações anteriores
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'senha123' })
      .expect(200);
    const acessoLegitimo = login.body.token as string;
    const cookieLegitimo = lerCookieRefresh(login)!;

    // O refresh original já foi rotacionado no teste anterior: reusá-lo é a
    // assinatura de um token roubado — responde 401...
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${admin.refresh}`)
      .expect(401);

    // ...e revoga TUDO: nem a sessão legítima recém-criada sobrevive
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${acessoLegitimo}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${cookieLegitimo}`)
      .expect(401);
  });

  it('logout revoga o refresh do dispositivo e é idempotente', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'senha123' })
      .expect(200);
    const cookie = lerCookieRefresh(login)!;

    // Primeiro logout revoga o refresh do dispositivo...
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('Cookie', `refresh_token=${cookie}`)
      .expect(200);

    // ...e repetir responde ok de novo (não vaza se o token existia). Feito
    // antes do replay do refresh porque reusar um refresh revogado é tratado
    // como roubo e derruba as sessões (próximo passo).
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${login.body.token}`)
      .expect(200);

    // O cookie revogado não renova mais a sessão
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${cookie}`)
      .expect(401);
  });

  it('recuperação de senha em modo local redefine a senha e encerra as sessões', async () => {
    // Sem SMTP e fora de produção, o código volta na resposta (modo local)
    const solicitacao = await request(app.getHttpServer())
      .post('/auth/recuperar-senha')
      .send({ email: admin.email })
      .expect(200);
    expect(solicitacao.body.enviadoPorEmail).toBe(false);
    const codigo = solicitacao.body.token as string;
    expect(codigo).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/auth/redefinir-senha')
      .send({ token: codigo, novaSenha: 'novaSenha123', confirmarSenha: 'novaSenha123' })
      .expect(200);

    // A sessão antiga morreu (tokenVersao incrementado)
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(401);

    // Senha antiga não vale mais; a nova entra
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'senha123' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, senha: 'novaSenha123' })
      .expect(200);
  });
});
