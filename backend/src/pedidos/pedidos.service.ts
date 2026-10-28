import {
  ConflictException,
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
import { deCentavos, paraCentavos } from '../common/dinheiro';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PedidosGateway,
    private readonly configuracoes: ConfiguracoesService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Listar pedidos do estabelecimento (console admin escopado).
  // Paginação opcional: sem parâmetros devolve a lista inteira (comportamento
  // original do painel); com `pagina`, devolve só a fatia pedida.
  async findAll(
    estabelecimentoId: string,
    filtros: { pagina?: number; tamanhoPagina?: number; status?: string } = {},
  ) {
    const { pagina, tamanhoPagina, status } = filtros;
    const paginando = pagina !== undefined || tamanhoPagina !== undefined;
    const take = paginando ? (tamanhoPagina ?? 50) : undefined;
    const skip = paginando ? ((pagina ?? 1) - 1) * (take ?? 50) : undefined;

    return this.prisma.pedido.findMany({
      where: {
        estabelecimentoId,
        ...(status ? { status } : {}),
      },
      include: {
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(take !== undefined ? { take, skip } : {}),
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

    // O admin pode marcar a casa como "não aceitando pedidos". A checagem
    // precisa acontecer aqui, no servidor: a interface só esconde o botão de
    // envio, mas um payload direto à API não pode passar por cima do estado.
    const { aceitandoPedidos } = await this.configuracoes.obterAceitandoPedidos(
      estabelecimento.id,
    );
    if (!aceitandoPedidos) {
      throw new ConflictException(
        'Este estabelecimento não está aceitando pedidos no momento.',
      );
    }

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
        grupos: true,
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

    // Toda a aritmética monetária roda em centavos inteiros e só vira o
    // `number` de 2 casas na hora de gravar: somar em ponto flutuante acumula
    // erro binário (0.1 + 0.2) e gravaria um `total` errado no `Decimal`.
    let totalCentavos = 0;
    const itensParaCriar = data.itens.map((item) => {
      const produto = produtosMap.get(item.produtoId)!;
      const precoBase = paraCentavos(produto.preco);
      const montagem = produto.tipo === 'MARMITA';

      // Soma o preço de cada ingrediente adicionado como extra
      const adicionadosNomes: string[] = [];
      let adicionalCentavos = 0;

      for (const id of item.adicionados ?? []) {
        const vinculo = produto.ingredientes.find(
          (c) => c.ingredienteId === id,
        );
        // Rejeita em vez de somar 0: um `adicionados` desconhecido pagaria o
        // extra sem custo e ainda poluiria o comanda com o bruto do payload.
        if (!vinculo) {
          throw new BadRequestException(
            'Um dos ingredientes adicionados não pertence a este produto.',
          );
        }
        adicionadosNomes.push(vinculo.ingrediente.nome);
        adicionalCentavos += paraCentavos(vinculo.precoAdicional ?? 0);
      }

      if (montagem) {
        // Teto e piso do grupo são regra do cardápio, não só da interface:
        // precisam ser conferidos aqui, senão um cliente burla o limite
        // enviando o payload direto.
        this.validarEscolhasDosGrupos(produto, item.adicionados ?? []);
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

      const precoUnitarioCentavos = precoBase + adicionalCentavos;

      totalCentavos += precoUnitarioCentavos * Number(item.quantidade);

      return {
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        preco: deCentavos(precoUnitarioCentavos),
        removidos: JSON.stringify(removidosNomes),
        adicionados: JSON.stringify(adicionadosNomes),
      };
    });

    // Pedidos de entrega somam a taxa definida pelo admin no Faturamento
    let taxaEntregaCentavos = 0;
    if (tipoEntrega === TipoEntrega.ENTREGA) {
      const config = await this.configuracoes.obterTaxaEntrega(
        estabelecimento.id,
      );
      taxaEntregaCentavos = paraCentavos(config.taxaEntrega);
      totalCentavos += taxaEntregaCentavos;
    }

    // Forma de pagamento e troco (apenas válidos para dinheiro)
    const formaPagamento = data.formaPagamento ?? FormaPagamento.DINHEIRO;
    const trocoParaCentavos =
      data.trocoPara !== undefined ? paraCentavos(data.trocoPara) : null;
    if (
      trocoParaCentavos !== null &&
      formaPagamento !== FormaPagamento.DINHEIRO
    ) {
      throw new BadRequestException(
        'Troco só é aceito para pagamento em dinheiro.',
      );
    }
    if (trocoParaCentavos !== null && trocoParaCentavos < totalCentavos) {
      throw new BadRequestException(
        'O valor informado para troco é menor que o total do pedido.',
      );
    }

    // Cria o pedido junto com seus itens na mesma transação
    const pedido = await this.prisma.$transaction(async (tx) => {
      return tx.pedido.create({
        data: {
          cliente: data.cliente,
          tipoEntrega,
          endereco: data.endereco,
          telefone: data.telefone,
          taxaEntrega: deCentavos(taxaEntregaCentavos),
          total: deCentavos(totalCentavos),
          formaPagamento,
          trocoPara:
            trocoParaCentavos === null ? null : deCentavos(trocoParaCentavos),
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
    });

    this.gateway.emitirPedidoCriado(estabelecimento.id, pedido);
    return pedido;
  }

  // Atualizar o status do pedido. O fluxo depende do tipo de entrega e tem
  // dois ramos (ver validarTransicao): retirada passa por PRONTO e entrega por
  // EM_ROTA — são alternativas, não etapas consecutivas.
  async updateStatus(estabelecimentoId: string, id: string, status: string) {
    const atual = await this.findOne(estabelecimentoId, id);
    this.validarTransicao(atual.status, atual.tipoEntrega, status);

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

  // Estados que encerram o pedido. Depois deles o pedido não volta ao fluxo
  // ativo: só aceitam repetição do próprio valor (idempotente).
  private static readonly STATUS_TERMINAIS = [
    'CONCLUIDO',
    'CANCELADO',
  ] as const;

  // O painel já mostra apenas as opções válidas na interface, mas o endpoint é
  // a autoridade: sem estas regras um PATCH direto marcava CONCLUIDO →
  // PENDENTE, ressuscitava um cancelado ou encaixava "Em rota" em retirada.
  //
  // IMPORTANTE: o que é conferido aqui é só (1) o travamento dos estados
  // terminais e (2) a coerência com o tipo de entrega. A ORDEM do fluxo
  // (PENDENTE → EM_PREPARO → PRONTO/EM_ROTA → CONCLUIDO) é convenção da
  // interface, NÃO validada no servidor: pular etapas ou voltar dentro do
  // fluxo ativo é aceito de propósito (ajustes manuais do painel). Os ramos
  // são alternativos, não consecutivos: retirada usa PRONTO, entrega usa
  // EM_ROTA.
  private validarTransicao(
    statusAtual: string,
    tipoEntrega: string,
    novoStatus: string,
  ): void {
    const terminais = PedidosService.STATUS_TERMINAIS as readonly string[];
    if (terminais.includes(statusAtual) && statusAtual !== novoStatus) {
      const rotulo = statusAtual === 'CANCELADO' ? 'cancelado' : 'concluído';
      throw new ConflictException(
        `Pedido já está ${rotulo} e não pode voltar para ${novoStatus}.`,
      );
    }

    // Retirada não tem "Em rota" (usa "Pronto"); entrega não usa "Pronto".
    if (tipoEntrega === 'RETIRADA' && novoStatus === 'EM_ROTA') {
      throw new BadRequestException(
        'Pedido de retirada não pode ficar "Em rota". Use PRONTO.',
      );
    }
    if (tipoEntrega === 'ENTREGA' && novoStatus === 'PRONTO') {
      throw new BadRequestException(
        'Pedido de entrega não usa "Pronto". Use EM_ROTA.',
      );
    }
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
  // pedido, sem PII do cliente (nome, telefone, endereço) nem forma de
  // pagamento/troco. Aceita o UUID completo ou o código curto exibido ao
  // cliente (#ABC12345, os 8 primeiros caracteres do UUID), que deixa o link
  // de acompanhamento bem menor. Inclui o slug para o cliente voltar ao
  // cardápio correto.
  async rastrear(id: string) {
    const bruto = id.trim();
    const ehUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bruto,
      );
    const inclusao = {
      itens: {
        include: { produto: { select: { nome: true } } },
      },
      estabelecimento: { select: { slug: true } },
    } as const;

    // Código curto vira busca por prefixo (UUIDs são hex minúsculo); o
    // findUnique só serve para chave primária completa.
    const pedido = ehUuid
      ? await this.prisma.pedido.findUnique({
          where: { id: bruto },
          include: inclusao,
        })
      : await this.prisma.pedido.findFirst({
          where: { id: { startsWith: bruto.toLowerCase() } },
          include: inclusao,
        });

    if (!pedido) {
      throw new NotFoundException(`Pedido com ID ${id} não encontrado.`);
    }

    return {
      id: pedido.id,
      slug: pedido.estabelecimento.slug,
      status: pedido.status,
      tipoEntrega: pedido.tipoEntrega,
      taxaEntrega: pedido.taxaEntrega,
      total: pedido.total,
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

  // Confere as porções de cada grupo escolhido no item: o teto (maximoEscolhas)
  // e o piso (minimoEscolhas, o grupo que exige escolha). A repetição conta:
  // pedir duas vezes a mesma proteína são duas porções do grupo.
  private validarEscolhasDosGrupos(
    produto: {
      nome: string;
      grupos: {
        id: string;
        nome: string;
        maximoEscolhas: number;
        minimoEscolhas: number;
      }[];
      ingredientes: { ingredienteId: string; grupoId: string | null }[];
    },
    escolhidos: string[],
  ): void {
    if (produto.grupos.length === 0) return;

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

    // Percorre todos os grupos, não só os escolhidos: um grupo obrigatório e
    // ignorado pelo cliente tem total 0 e ainda assim precisa ser recusado.
    for (const grupo of produto.grupos) {
      const total = totais.get(grupo.nome) ?? 0;

      if (total > grupo.maximoEscolhas) {
        const unidade = grupo.maximoEscolhas === 1 ? 'porção' : 'porções';
        throw new BadRequestException(
          `Em "${produto.nome}", o grupo "${grupo.nome}" aceita no máximo ${grupo.maximoEscolhas} ${unidade}.`,
        );
      }

      if (total < grupo.minimoEscolhas) {
        const unidade = grupo.minimoEscolhas === 1 ? 'porção' : 'porções';
        throw new BadRequestException(
          `Em "${produto.nome}", o grupo "${grupo.nome}" exige ao menos ${grupo.minimoEscolhas} ${unidade}.`,
        );
      }
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
