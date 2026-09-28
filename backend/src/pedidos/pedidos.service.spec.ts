import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { PedidosService } from './pedidos.service';
import { FormaPagamento, TipoEntrega } from './dto/create-pedido.dto';
import type { CreatePedidoDto } from './dto/create-pedido.dto';
import type { PedidosGateway } from './pedidos.gateway';

// O gateway importa @nestjs/jwt e socket.io, que são ESM e não são
// transformados pelo Jest (CJS). Como o PedidosService só o usa via injeção de
// dependência, carregamos um stub no lugar do módulo real — o gateway em si
// não é o que este teste exercita.
jest.mock('./pedidos.gateway', () => ({ PedidosGateway: class {} }));

const ESTABELECIMENTO = { id: 'est-1', nome: 'Pizzaria', slug: 'pizzaria' };

interface IngredienteVinculado {
  ingredienteId: string;
  precoAdicional: number;
  ingrediente: { nome: string };
}

interface ProdutoFake {
  id: string;
  preco: number;
  ingredientes: IngredienteVinculado[];
}

interface DadosPedidoCriado {
  total: number;
  taxaEntrega: number;
  formaPagamento: string;
  trocoPara: number | null;
  tipoEntrega: string;
  itens: {
    create: {
      produtoId: string;
      quantidade: number;
      preco: number;
      removidos: string;
      adicionados: string;
    }[];
  };
}

type PedidoCreateArgs = { data: DadosPedidoCriado };

describe('PedidosService', () => {
  let service: PedidosService;

  let produtoFindMany: jest.Mock;
  let pedidoCreate: jest.Mock<Promise<{ id: string }>, [PedidoCreateArgs]>;
  let pedidoFindUnique: jest.Mock;
  let pedidoUpdate: jest.Mock;
  let pedidoDelete: jest.Mock;
  let obterTaxaEntrega: jest.Mock;
  let emitirPedidoCriado: jest.Mock;
  let emitirPedidoAtualizado: jest.Mock;
  let emitirPedidoRemovido: jest.Mock;

  function produto(
    id: string,
    preco: number,
    ingredientes: IngredienteVinculado[] = [],
  ): ProdutoFake {
    return { id, preco, ingredientes };
  }

  function vinculo(
    ingredienteId: string,
    precoAdicional: number,
    nome: string,
  ) {
    return { ingredienteId, precoAdicional, ingrediente: { nome } };
  }

  function pedidoBase(
    overrides: Partial<CreatePedidoDto> = {},
  ): CreatePedidoDto {
    return {
      slug: 'pizzaria',
      cliente: 'Ana',
      tipoEntrega: TipoEntrega.RETIRADA,
      telefone: '11988887777',
      itens: [{ produtoId: 'p1', quantidade: 1 }],
      ...overrides,
    };
  }

  // Devolve o `data` enviado ao prisma.pedido.create, que é onde ficam os
  // valores calculados pelo serviço (total, taxa, preço unitário).
  function dadosCriados(): DadosPedidoCriado {
    const chamada = pedidoCreate.mock.calls[0][0];
    return chamada.data;
  }

  beforeEach(() => {
    produtoFindMany = jest.fn().mockResolvedValue([]);
    pedidoCreate = jest.fn<Promise<{ id: string }>, [PedidoCreateArgs]>(
      ({ data }) => Promise.resolve({ id: 'ped-1', ...data }),
    );
    pedidoFindUnique = jest.fn().mockResolvedValue(null);
    pedidoUpdate = jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: 'ped-1', ...data }),
      );
    pedidoDelete = jest.fn().mockResolvedValue({ id: 'ped-1' });
    obterTaxaEntrega = jest.fn().mockResolvedValue({ taxaEntrega: 0 });
    emitirPedidoCriado = jest.fn();
    emitirPedidoAtualizado = jest.fn();
    emitirPedidoRemovido = jest.fn();

    const prisma = {
      produto: { findMany: produtoFindMany },
      pedido: {
        create: pedidoCreate,
        findUnique: pedidoFindUnique,
        update: pedidoUpdate,
        delete: pedidoDelete,
      },
    } as unknown as PrismaService;

    const configuracoes = {
      obterTaxaEntrega,
    } as unknown as ConfiguracoesService;

    const estabelecimentos = {
      porSlug: jest.fn().mockResolvedValue(ESTABELECIMENTO),
    } as unknown as EstabelecimentosService;

    const gateway = {
      emitirPedidoCriado,
      emitirPedidoAtualizado,
      emitirPedidoRemovido,
    } as unknown as PedidosGateway;

    service = new PedidosService(
      prisma,
      gateway,
      configuracoes,
      estabelecimentos,
    );
  });

  describe('create — validações', () => {
    it('recusa pedido sem itens', async () => {
      await expect(service.create(pedidoBase({ itens: [] }))).rejects.toThrow(
        BadRequestException,
      );
      expect(pedidoCreate).not.toHaveBeenCalled();
    });

    it('recusa entrega sem endereço', async () => {
      await expect(
        service.create(pedidoBase({ tipoEntrega: TipoEntrega.ENTREGA })),
      ).rejects.toThrow(/endereço/i);
      expect(pedidoCreate).not.toHaveBeenCalled();
    });

    it('recusa produto de outro estabelecimento (vazamento entre tenants)', async () => {
      // O prisma devolve menos produtos do que o pedido referencia: um id não
      // pertence ao estabelecimento informado.
      produtoFindMany.mockResolvedValue([produto('p1', 10)]);

      await expect(
        service.create(
          pedidoBase({
            itens: [
              { produtoId: 'p1', quantidade: 1 },
              { produtoId: 'p2-de-outro-tenant', quantidade: 1 },
            ],
          }),
        ),
      ).rejects.toThrow(/não existem/i);
      expect(pedidoCreate).not.toHaveBeenCalled();
    });

    it('recusa troco em pagamento que não seja dinheiro', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 10)]);

      await expect(
        service.create(
          pedidoBase({ formaPagamento: FormaPagamento.PIX, trocoPara: 50 }),
        ),
      ).rejects.toThrow(/dinheiro/i);
      expect(pedidoCreate).not.toHaveBeenCalled();
    });

    it('recusa valor de troco menor que o total', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 30)]);

      await expect(
        service.create(
          pedidoBase({
            formaPagamento: FormaPagamento.DINHEIRO,
            trocoPara: 20,
          }),
        ),
      ).rejects.toThrow(/menor que o total/i);
      expect(pedidoCreate).not.toHaveBeenCalled();
    });
  });

  describe('create — cálculo do total', () => {
    it('multiplica preço unitário pela quantidade', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 12.5)]);

      await service.create(
        pedidoBase({ itens: [{ produtoId: 'p1', quantidade: 3 }] }),
      );

      expect(dadosCriados().total).toBe(37.5);
    });

    it('soma o adicional dos ingredientes escolhidos ao preço unitário', async () => {
      produtoFindMany.mockResolvedValue([
        produto('p1', 20, [
          vinculo('ing-queijo', 3, 'Queijo extra'),
          vinculo('ing-bacon', 4.5, 'Bacon'),
        ]),
      ]);

      await service.create(
        pedidoBase({
          itens: [
            {
              produtoId: 'p1',
              quantidade: 1,
              adicionados: ['ing-queijo', 'ing-bacon'],
            },
          ],
        }),
      );

      const dados = dadosCriados();
      expect(dados.itens.create[0].preco).toBe(27.5);
      expect(dados.total).toBe(27.5);
    });

    it('soma os itens de produtos diferentes', async () => {
      produtoFindMany.mockResolvedValue([
        produto('p1', 10),
        produto('p2', 5.5),
      ]);

      await service.create(
        pedidoBase({
          itens: [
            { produtoId: 'p1', quantidade: 2 },
            { produtoId: 'p2', quantidade: 1 },
          ],
        }),
      );

      expect(dadosCriados().total).toBe(25.5);
    });

    it('soma a taxa de entrega somente em pedidos com entrega', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 10)]);
      obterTaxaEntrega.mockResolvedValue({ taxaEntrega: 7 });

      await service.create(
        pedidoBase({ itens: [{ produtoId: 'p1', quantidade: 2 }] }),
      );
      expect(dadosCriados().taxaEntrega).toBe(0);
      expect(dadosCriados().total).toBe(20);

      pedidoCreate.mockClear();
      await service.create(
        pedidoBase({
          tipoEntrega: TipoEntrega.ENTREGA,
          endereco: 'Rua A, 10',
          itens: [{ produtoId: 'p1', quantidade: 2 }],
        }),
      );
      expect(dadosCriados().taxaEntrega).toBe(7);
      expect(dadosCriados().total).toBe(27);
    });

    it('guarda os nomes dos ingredientes adicionados e removidos em JSON', async () => {
      produtoFindMany.mockResolvedValue([
        produto('p1', 10, [
          vinculo('ing-picao', 2, 'Picles'),
          vinculo('ing-cebola', 0, 'Cebola'),
        ]),
      ]);

      await service.create(
        pedidoBase({
          itens: [
            {
              produtoId: 'p1',
              quantidade: 1,
              adicionados: ['ing-picao'],
              removidos: ['ing-cebola'],
            },
          ],
        }),
      );

      const item = dadosCriados().itens.create[0];
      expect(JSON.parse(item.adicionados)).toEqual(['Picles']);
      expect(JSON.parse(item.removidos)).toEqual(['Cebola']);
    });

    it('defaulta para dinheiro e retirada quando o checkout não informa', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 10)]);

      await service.create(pedidoBase());

      const dados = dadosCriados();
      expect(dados.formaPagamento).toBe(FormaPagamento.DINHEIRO);
      expect(dados.tipoEntrega).toBe(TipoEntrega.RETIRADA);
      expect(dados.trocoPara).toBeNull();
    });

    it('avisa o painel do estabelecimento via gateway', async () => {
      produtoFindMany.mockResolvedValue([produto('p1', 10)]);

      await service.create(pedidoBase());

      expect(emitirPedidoCriado).toHaveBeenCalledWith(
        ESTABELECIMENTO.id,
        expect.objectContaining({ id: 'ped-1' }),
      );
    });
  });

  describe('findOne — isolamento de tenant', () => {
    it('devolve o pedido quando pertence ao estabelecimento', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        estabelecimentoId: ESTABELECIMENTO.id,
      });

      await expect(
        service.findOne(ESTABELECIMENTO.id, 'ped-1'),
      ).resolves.toMatchObject({
        id: 'ped-1',
      });
    });

    it('recusa pedido de outro estabelecimento com 404', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        estabelecimentoId: 'est-outro',
      });

      await expect(
        service.findOne(ESTABELECIMENTO.id, 'ped-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('recusa pedido inexistente com 404', async () => {
      pedidoFindUnique.mockResolvedValue(null);

      await expect(
        service.findOne(ESTABELECIMENTO.id, 'nao-existe'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('atualiza e avisa o painel quando o pedido é do estabelecimento', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        estabelecimentoId: ESTABELECIMENTO.id,
      });

      await service.updateStatus(ESTABELECIMENTO.id, 'ped-1', 'EM_PREPARO');

      expect(pedidoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ped-1' },
          data: { status: 'EM_PREPARO' },
        }),
      );
      expect(emitirPedidoAtualizado).toHaveBeenCalled();
    });

    it('não altera pedido de outro estabelecimento', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        estabelecimentoId: 'est-outro',
      });

      await expect(
        service.updateStatus(ESTABELECIMENTO.id, 'ped-1', 'CONCLUIDO'),
      ).rejects.toThrow(NotFoundException);
      expect(pedidoUpdate).not.toHaveBeenCalled();
      expect(emitirPedidoAtualizado).not.toHaveBeenCalled();
    });
  });

  describe('rastrear — acompanhamento público', () => {
    it('devolve o slug do estabelecimento para o cliente voltar ao cardápio', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        cliente: 'Ana',
        tipoEntrega: TipoEntrega.RETIRADA,
        endereco: null,
        telefone: '11988887777',
        taxaEntrega: 0,
        total: 25,
        formaPagamento: FormaPagamento.PIX,
        trocoPara: null,
        status: 'PENDENTE',
        criadoEm: new Date('2026-09-25T12:00:00Z'),
        estabelecimento: { slug: 'pizzaria' },
        itens: [
          {
            quantidade: 2,
            preco: 12.5,
            removidos: JSON.stringify(['Cebola']),
            adicionados: JSON.stringify(['Bacon']),
            produto: { nome: 'Pizza' },
          },
        ],
      });

      const rastreio = await service.rastrear('ped-1');

      expect(rastreio.slug).toBe('pizzaria');
      expect(rastreio.itens).toEqual([
        {
          nome: 'Pizza',
          quantidade: 2,
          preco: 12.5,
          removidos: ['Cebola'],
          adicionados: ['Bacon'],
        },
      ]);
    });

    it('não quebra o acompanhamento com JSON corrompido', async () => {
      pedidoFindUnique.mockResolvedValue({
        id: 'ped-1',
        cliente: 'Ana',
        tipoEntrega: TipoEntrega.RETIRADA,
        endereco: null,
        telefone: '11988887777',
        taxaEntrega: 0,
        total: 25,
        formaPagamento: FormaPagamento.DINHEIRO,
        trocoPara: null,
        status: 'PENDENTE',
        criadoEm: new Date('2026-09-25T12:00:00Z'),
        estabelecimento: { slug: 'pizzaria' },
        itens: [
          {
            quantidade: 1,
            preco: 25,
            removidos: '{isto não é json',
            adicionados: '',
            produto: { nome: 'Pizza' },
          },
        ],
      });

      const rastreio = await service.rastrear('ped-1');

      expect(rastreio.itens[0].removidos).toEqual([]);
      expect(rastreio.itens[0].adicionados).toEqual([]);
    });

    it('recusa pedido inexistente com 404', async () => {
      pedidoFindUnique.mockResolvedValue(null);

      await expect(service.rastrear('nao-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
