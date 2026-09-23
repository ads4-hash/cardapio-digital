import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePedidoDto, FormaPagamento, TipoEntrega } from './dto/create-pedido.dto';
import { PedidosGateway } from './pedidos.gateway';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PedidosGateway,
    private readonly configuracoes: ConfiguracoesService,
  ) {}

  // Listar todos os pedidos com os itens e dados do produto
  async findAll() {
    return this.prisma.pedido.findMany({
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar um pedido por ID
  async findOne(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }

    return pedido;
  }

  // Criar um novo pedido
  async create(data: CreatePedidoDto) {
    if (!data.itens || data.itens.length === 0) {
      throw new BadRequestException(
        'O pedido precisa conter pelo menos um item.',
      );
    }

    // Nome do cliente obrigatório; endereço exigido apenas para entrega
    const tipoEntrega = data.tipoEntrega ?? TipoEntrega.RETIRADA;
    if (tipoEntrega === TipoEntrega.ENTREGA && !data.endereco?.trim()) {
      throw new BadRequestException(
        'Informe o endereço de entrega para pedidos com entrega.',
      );
    }

    // Busca os preços atuais de cada produto e seus ingredientes. O mesmo
    // produto pode aparecer mais de uma vez no pedido (cada personalização
    // gera uma linha própria), então valida por ids únicos.
    const produtoIds = [...new Set(data.itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: produtoIds } },
      include: {
        ingredientes: {
          include: { ingrediente: true },
        },
      },
    });

    if (produtos.length !== produtoIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos informados não existem.',
      );
    }

    const produtosMap = new Map(produtos.map((p) => [p.id, p]));

    let total = 0;
    const itensParaCriar = data.itens.map((item) => {
      const produto = produtosMap.get(item.produtoId)!;
      const precoBase = Number(produto.preco);

      // Soma o preço de cada ingrediente adicionado como extra
      const adicionadosNomes: string[] = [];
      let adicionalTotal = 0;

      for (const id of item.adicionados ?? []) {
        const vinculo = produto.ingredientes.find(
          (c) => c.ingredienteId === id,
        );
        const nome = vinculo?.ingrediente.nome ?? id;
        adicionadosNomes.push(nome);
        adicionalTotal += Number(vinculo?.precoAdicional ?? 0);
      }

      // Guarda os nomes dos ingredientes removidos
      const removidosNomes: string[] = [];
      for (const id of item.removidos ?? []) {
        const vinculo = produto.ingredientes.find(
          (c) => c.ingredienteId === id,
        );
        removidosNomes.push(vinculo?.ingrediente.nome ?? id);
      }

      const precoUnitario = precoBase + adicionalTotal;

      total += precoUnitario * Number(item.quantidade);

      return {
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        preco: precoUnitario,
        removidos: JSON.stringify(removidosNomes),
        adicionados: JSON.stringify(adicionadosNomes),
      };
    });

    // Pedidos de entrega somam a taxa definida pelo admin no Faturamento
    let taxaEntrega = 0;
    if (tipoEntrega === TipoEntrega.ENTREGA) {
      const config = await this.configuracoes.obterTaxaEntrega();
      taxaEntrega = config.taxaEntrega;
      total += taxaEntrega;
    }

    // Forma de pagamento e troco (apenas válidos para dinheiro)
    const formaPagamento =
      data.formaPagamento ?? FormaPagamento.DINHEIRO;
    let trocoPara: number | null = data.trocoPara ?? null;
    if (trocoPara !== null && formaPagamento !== FormaPagamento.DINHEIRO) {
      throw new BadRequestException(
        'Troco só é aceito para pagamento em dinheiro.',
      );
    }
    if (trocoPara !== null && trocoPara < total) {
      throw new BadRequestException(
        'O valor informado para troco é menor que o total do pedido.',
      );
    }

    // Cria o pedido junto com seus itens na mesma transação
    const pedido = await this.prisma.pedido.create({
      data: {
        cliente: data.cliente,
        tipoEntrega,
        endereco: data.endereco,
        telefone: data.telefone,
        taxaEntrega,
        total,
        formaPagamento,
        trocoPara,
        itens: {
          create: itensParaCriar,
        },
      },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    this.gateway.emitirPedidoCriado(pedido);
    return pedido;
  }

  // Atualizar o status do pedido (PENDENTE, EM_PREPARO, EM_ROTA, CONCLUIDO, CANCELADO)
  async updateStatus(id: string, status: string) {
    await this.findOne(id);

    const pedido = await this.prisma.pedido.update({
      where: { id },
      data: { status },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
    });

    this.gateway.emitirPedidoAtualizado(pedido);
    return pedido;
  }

  // Deletar pedido
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.pedido.delete({
      where: { id },
    });
    this.gateway.emitirPedidoRemovido(id);
  }

  // Consulta pública de acompanhamento: retorna apenas dados minimalistas do
  // pedido (o ID em UUID já funciona como "senha" de acesso não adivinhável)
  async rastrear(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        itens: {
          include: { produto: { select: { nome: true } } },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }

    return {
      id: pedido.id,
      status: pedido.status,
      cliente: pedido.cliente,
      tipoEntrega: pedido.tipoEntrega,
      endereco: pedido.endereco,
      telefone: pedido.telefone,
      taxaEntrega: pedido.taxaEntrega,
      total: pedido.total,
      formaPagamento: pedido.formaPagamento,
      trocoPara: pedido.trocoPara,
      criadoEm: pedido.createdAt,
      itens: pedido.itens.map((item) => ({
        nome: item.produto.nome,
        quantidade: item.quantidade,
        preco: item.preco,
        removidos: this.parseLista(item.removidos),
        adicionados: this.parseLista(item.adicionados),
      })),
    };
  }

  // Converte os nomes de ingredientes salvos (JSON) de volta para lista
  private parseLista(valor: string): string[] {
    const parsed: unknown = JSON.parse(valor);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
