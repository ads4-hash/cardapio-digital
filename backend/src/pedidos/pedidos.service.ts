import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePedidoDto,
  FormaPagamento,
  TipoEntrega,
} from './dto/create-pedido.dto';
import { PedidosGateway } from './pedidos.gateway';
import { ConfiguracoesService } from '../configuracoes/configuracoes.service';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PedidosGateway,
    private readonly configuracoes: ConfiguracoesService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Listar todos os pedidos de um estabelecimento (console admin escopado)
  async findAll(estabelecimentoId: string) {
    return this.prisma.pedido.findMany({
      where: { estabelecimentoId },
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

  // Buscar um pedido por ID (sempre dentro do estabelecimento)
  async findOne(estabelecimentoId: string, id: string) {
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

    if (!pedido || pedido.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }

    return pedido;
  }

  // Criar um novo pedido. O slug identifica o estabelecimento de destino; os
  // produtos são validados dentro do tenant para impedir preço/estoque cruzado.
  async create(data: CreatePedidoDto) {
    if (!data.itens || data.itens.length === 0) {
      throw new BadRequestException(
        'O pedido precisa conter pelo menos um item.',
      );
    }

    const estabelecimento = await this.estabelecimentos.porSlug(data.slug);

    // Nome do cliente obrigatório; endereço exigido apenas para entrega
    const tipoEntrega = data.tipoEntrega ?? TipoEntrega.RETIRADA;
    if (tipoEntrega === TipoEntrega.ENTREGA && !data.endereco?.trim()) {
      throw new BadRequestException(
        'Informe o endereço de entrega para pedidos com entrega.',
      );
    }

    // Busca os preços atuais de cada produto e seus ingredientes, sempre
    // restringindo ao estabelecimento informado. O mesmo produto pode aparecer
    // mais de uma vez no pedido, então valida por ids únicos.
    const produtoIds = [...new Set(data.itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: produtoIds }, estabelecimentoId: estabelecimento.id },
      include: {
        ingredientes: {
          include: { ingrediente: true, grupo: true },
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
      const montagem = produto.tipo === 'MARMITA';

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

      if (montagem) {
        // O teto do grupo é regra do cardápio, não só da interface: precisa ser
        // conferido aqui, senão um cliente burla o limite enviando direto.
        this.validarTetoDosGrupos(produto, item.adicionados ?? []);
      }

      // Guarda os nomes dos ingredientes removidos. Em produtos de montagem
      // nada é "removido": o cliente simplesmente não escolheu, e listar tudo o
      // que ficou de fora só poluiria a tela da cozinha.
      const removidosNomes: string[] = [];
      if (!montagem) {
        for (const id of item.removidos ?? []) {
          const vinculo = produto.ingredientes.find(
            (c) => c.ingredienteId === id,
          );
          removidosNomes.push(vinculo?.ingrediente.nome ?? id);
        }
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
      const config = await this.configuracoes.obterTaxaEntrega(
        estabelecimento.id,
      );
      taxaEntrega = config.taxaEntrega;
      total += taxaEntrega;
    }

    // Forma de pagamento e troco (apenas válidos para dinheiro)
    const formaPagamento = data.formaPagamento ?? FormaPagamento.DINHEIRO;
    const trocoPara: number | null = data.trocoPara ?? null;
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
        estabelecimentoId: estabelecimento.id,
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

    this.gateway.emitirPedidoCriado(estabelecimento.id, pedido);
    return pedido;
  }

  // Atualizar o status do pedido (PENDENTE, EM_PREPARO, EM_ROTA, CONCLUIDO, CANCELADO)
  async updateStatus(estabelecimentoId: string, id: string, status: string) {
    await this.findOne(estabelecimentoId, id);

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

    this.gateway.emitirPedidoAtualizado(estabelecimentoId, pedido);
    return pedido;
  }

  // Deletar pedido
  async remove(estabelecimentoId: string, id: string) {
    await this.findOne(estabelecimentoId, id);
    await this.prisma.pedido.delete({
      where: { id },
    });
    this.gateway.emitirPedidoRemovido(estabelecimentoId, id);
  }

  // Consulta pública de acompanhamento: retorna apenas dados minimalistas do
  // pedido (o ID em UUID já funciona como "senha" de acesso não adivinhável).
  // Inclui o slug para o cliente poder voltar ao cardápio correto.
  async rastrear(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        itens: {
          include: { produto: { select: { nome: true } } },
        },
        estabelecimento: { select: { slug: true } },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }

    return {
      id: pedido.id,
      slug: pedido.estabelecimento.slug,
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

  // Confere o teto de porções de cada grupo escolhido no item. A repetição
  // conta: pedir duas vezes a mesma proteína são duas porções do grupo.
  private validarTetoDosGrupos(
    produto: {
      nome: string;
      grupos: { id: string; nome: string; maximoEscolhas: number }[];
      ingredientes: { ingredienteId: string; grupoId: string | null }[];
    },
    escolhidos: string[],
  ): void {
    if (produto.grupos.length === 0) return;

    const porNome = new Map(produto.grupos.map((g) => [g.nome, g]));
    const totais = new Map<string, number>();

    for (const ingredienteId of escolhidos) {
      const vinculo = produto.ingredientes.find(
        (c) => c.ingredienteId === ingredienteId,
      );
      const grupo = vinculo?.grupoId
        ? produto.grupos.find((g) => g.id === vinculo.grupoId)
        : undefined;
      if (!grupo) continue;
      totais.set(grupo.nome, (totais.get(grupo.nome) ?? 0) + 1);
    }

    for (const [nome, total] of totais) {
      const grupo = porNome.get(nome);
      if (!grupo || total <= grupo.maximoEscolhas) continue;

      const unidade =
        grupo.maximoEscolhas === 1 ? 'porção' : 'porções';
      throw new BadRequestException(
        `Em "${produto.nome}", o grupo "${grupo.nome}" aceita no máximo ${grupo.maximoEscolhas} ${unidade}.`,
      );
    }
  }

  // Converte os nomes de ingredientes salvos (JSON) de volta para lista.
  // Valores corrompidos/vazios viram lista vazia (nunca quebra o rastreio).
  private parseLista(valor: string): string[] {
    if (!valor) return [];
    try {
      const parsed: unknown = JSON.parse(valor);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
