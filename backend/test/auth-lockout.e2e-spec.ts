import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAdmin, montarAppE2E } from './utilitarios/app-e2e';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Lockout de login em app isolado: o bloqueio por IP (5 falhas em 15 min)
 * precisa de um arquivo próprio porque compartilhar o servidor com os demais
 * testes esgotaria antes o throttle de 10 logins/min do endpoint — e o 429
 * viria do ThrottlerGuard, não do AuthService. Aqui os contadores começam
 * zerados: cinco 401 seguidos de um 429 comprovam o lockout do serviço.
 */
describe('Auth — lockout de login (e2e)', () => {
  let app: INestApplication;
  let email: string;

  beforeAll(async () => {
    app = await montarAppE2E();
    email = (await criarAdmin(app, 'Casa Lockout')).email;
  });

  afterAll(async () => {
    // O bloqueio grava falhas no banco (compartilhado com os demais specs,
    // janela de 15 min): sem esta limpeza, qualquer spec que fizesse login
    // depois deste arquivo nasceria com o IP já bloqueado.
    await app.get(PrismaService).tentativaLogin.deleteMany({});
    await app.close();
  });

  it('bloqueia o IP após 5 falhas de login na janela de 15 minutos', async () => {
    let falhas = 0;
    let bloqueado = false;

    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, senha: `senha-errada-${tentativa}` });

      if (resposta.status === 429) {
        bloqueado = true;
        break;
      }
      expect(resposta.status).toBe(401);
      falhas++;
    }

    // Cinco falhas registradas e o bloqueio já responde na sexta tentativa —
    // bem abaixo do throttle de 10/min (que responderia 429 só a partir da
    // décima requisição).
    expect(bloqueado).toBe(true);
    expect(falhas).toBe(5);
  });

  it('mesmo com a senha correta, o bloqueio prevalece até a janela expirar', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, senha: 'senha123' })
      .expect(429);
    expect(resposta.body.mensagem).toContain('Muitas tentativas');
  });
});
