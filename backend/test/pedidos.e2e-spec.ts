import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AdminDeTeste, criarAdmin, montarAppE2E } from './utilitarios/app-e2e';

/**
 * e2e do fluxo de pedidos ponta a ponta com banco real: o admin monta o
 * catálogo pela API do painel, o cliente faz o pedido público, o
 * acompanhamento é verificado sem PII e o painel move os status — incluindo
 * os ramos retirada/entrega, o isolamento entre estabelecimentos e o bloqueio
 * quando a casa fecha.
 */
interface PedidoDeTeste {
  id: string;
  status: string;
  total: number;
  taxaEntrega: number;
  itens: { quantidade: number; preco: number }[];
}

describe('Pedidos (e2e)', () => {
  let app: INestApplication;
  let adminA: AdminDeTeste;
  let adminB: AdminDeTeste;
  let categoriaId: string;
  let produtoId: string;

  /** Cria um pedido RETIRADA de 2× X-Burger e devolve o corpo. */
  async function criarPedidoRetirada(): Promise<PedidoDeTeste> {
    const resposta = await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'RETIRADA',
        formaPagamento: 'DINHEIRO',
        trocoPara: 60,
        itens: [{ produtoId, quantidade: 2 }],
      })
      .expect(201);
    return resposta.body;
  }

  beforeAll(async () => {
    app = await montarAppE2E();
    adminA = await criarAdmin(app, 'Casa A');
    adminB = await criarAdmin(app, 'Casa B');

    // Catálogo montado pela própria API do painel (token do admin A)
    const categoria = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ nome: 'Lanches' })
      .expect(201);
    categoriaId = categoria.body.id;

    const produto = await request(app.getHttpServer())
      .post('/produtos')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ nome: 'X-Burger', preco: 25.9, categoriaId })
      .expect(201);
    produtoId = produto.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria pedido público com total calculado no servidor (preços não vêm do cliente)', async () => {
    const pedido = await criarPedidoRetirada();

    expect(pedido.status).toBe('PENDENTE');
    expect(pedido.total).toBe(51.8); // 25.9 × 2, aritmética em centavos
    expect(pedido.taxaEntrega).toBe(0);
    expect(pedido.itens).toHaveLength(1);
    expect(pedido.itens[0].quantidade).toBe(2);
  });

  it('rejeita troco menor que o total e entrega sem endereço', async () => {
    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'RETIRADA',
        formaPagamento: 'DINHEIRO',
        trocoPara: 10, // total é 51.8
        itens: [{ produtoId, quantidade: 2 }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'ENTREGA',
        // sem endereco
        itens: [{ produtoId, quantidade: 1 }],
      })
      .expect(400);
  });

  it('rejeita item com produto de outro estabelecimento', async () => {
    // O produto da casa A não existe no catálogo da casa B: o pedido é
    // recusado (400) sem vazar se o produto existe em outra casa
    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminB.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'RETIRADA',
        itens: [{ produtoId, quantidade: 1 }], // produto pertence à casa A
      })
      .expect(400);
  });

  it('rastreio público devolve o pedido sem PII nem forma de pagamento', async () => {
    const pedido = await criarPedidoRetirada();

    const rastreio = await request(app.getHttpServer())
      .get(`/pedidos/${pedido.id}/rastrear`)
      .expect(200);

    expect(rastreio.body.slug).toBe(adminA.slug);
    expect(rastreio.body.status).toBe('PENDENTE');
    expect(rastreio.body.itens[0].nome).toBe('X-Burger');
    // O UUID é o "segredo": quem consegue adivinhar não recebe dados sensíveis
    expect(rastreio.body).not.toHaveProperty('cliente');
    expect(rastreio.body).not.toHaveProperty('telefone');
    expect(rastreio.body).not.toHaveProperty('endereco');
    expect(rastreio.body).not.toHaveProperty('formaPagamento');
    expect(rastreio.body).not.toHaveProperty('trocoPara');
  });

  it('rastrear pedido inexistente responde 404', async () => {
    await request(app.getHttpServer())
      .get(`/pedidos/${randomUUID()}/rastrear`)
      .expect(404);
  });

  it('painel conduz o pedido de RETIRADA até o fim e barra o ramo de entrega', async () => {
    const pedido = await criarPedidoRetirada();
    const auth = { Authorization: `Bearer ${adminA.token}` };

    const emPreparo = await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'EM_PREPARO' })
      .expect(200);
    expect(emPreparo.body.status).toBe('EM_PREPARO');

    // Retirada não usa EM_ROTA (usa PRONTO)
    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'EM_ROTA' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'PRONTO' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'CONCLUIDO' })
      .expect(200);

    // CONCLUIDO é terminal: não volta para o fluxo (409)...
    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'EM_PREPARO' })
      .expect(409);

    // ...mas repetir o próprio valor é idempotente (reenvio do painel)
    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(auth)
      .send({ status: 'CONCLUIDO' })
      .expect(200);
  });

  it('painel conduz o pedido de ENTREGA pelo ramo EM_ROTA e barra PRONTO', async () => {
    const criado = await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Entrega',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'ENTREGA',
        endereco: 'Rua das Flores, 123',
        formaPagamento: 'PIX',
        itens: [{ produtoId, quantidade: 1 }],
      })
      .expect(201);
    const id = criado.body.id as string;
    const auth = { Authorization: `Bearer ${adminA.token}` };

    // Entrega não usa PRONTO (usa EM_ROTA)
    await request(app.getHttpServer())
      .patch(`/pedidos/${id}/status`)
      .set(auth)
      .send({ status: 'PRONTO' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/pedidos/${id}/status`)
      .set(auth)
      .send({ status: 'EM_ROTA' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/pedidos/${id}/status`)
      .set(auth)
      .send({ status: 'CONCLUIDO' })
      .expect(200);
  });

  it('admin de outra casa não enxerga nem mexe nos pedidos alheios', async () => {
    const pedido = await criarPedidoRetirada();
    const authB = { Authorization: `Bearer ${adminB.token}` };

    // Listagem do painel é escopada pelo token: casa B vê só a dela (vazio)
    const lista = await request(app.getHttpServer())
      .get('/pedidos')
      .set(authB)
      .expect(200);
    expect(lista.body).toHaveLength(0);

    // Detalhe e mudança de status de pedido alheio respondem 404 (não 403,
    // para não revelar que o pedido existe)
    await request(app.getHttpServer())
      .get(`/pedidos/${pedido.id}`)
      .set(authB)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/pedidos/${pedido.id}/status`)
      .set(authB)
      .send({ status: 'CANCELADO' })
      .expect(404);

    // A casa dona continua enxergando o pedido
    await request(app.getHttpServer())
      .get(`/pedidos/${pedido.id}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .expect(200);
  });

  it('recusa pedido novo quando a casa está com pedidos desligados (409)', async () => {
    const auth = { Authorization: `Bearer ${adminA.token}` };

    await request(app.getHttpServer())
      .patch('/configuracoes/aceitando-pedidos')
      .set(auth)
      .send({ aceitandoPedidos: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'RETIRADA',
        itens: [{ produtoId, quantidade: 1 }],
      })
      .expect(409);

    // Reabre para os próximos testes (e confirma o caminho feliz do toggle)
    await request(app.getHttpServer())
      .patch('/configuracoes/aceitando-pedidos')
      .set(auth)
      .send({ aceitandoPedidos: true })
      .expect(200);

    await request(app.getHttpServer())
      .post('/pedidos')
      .send({
        slug: adminA.slug,
        cliente: 'Cliente Teste',
        telefone: '(11) 91234-5678',
        tipoEntrega: 'RETIRADA',
        itens: [{ produtoId, quantidade: 1 }],
      })
      .expect(201);
  });
});
