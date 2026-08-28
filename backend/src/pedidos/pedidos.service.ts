import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Busca os preços atuais de cada produto
    const produtoIds = data.itens.map((i) => i.produtoId);
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: produtoIds } },
    });

    if (produtos.length !== produtoIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos informados não existem.',
      );
    }

    const produtosMap = new Map(produtos.map((p) => [p.id, p.preco]));

    let total = 0;
    const itensParaCriar = data.itens.map((item) => {
      const precoUnitario = Number(produtosMap.get(item.produtoId) ?? 0);

      total += precoUnitario * Number(item.quantidade);

      return {
        produtoId: item.produtoId,
        quantidade: Number(item.quantidade),
        preco: precoUnitario,
      };
    });

    // Cria o pedido junto com seus itens na mesma transação
    return this.prisma.pedido.create({
      data: {
        cliente: data.cliente,
        mesa: data.mesa,
        total,
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
  }

  // Atualizar o status do pedido (PENDENTE, EM_PREPARO, CONCLUIDO, CANCELADO)
  async updateStatus(id: string, status: string) {
    await this.findOne(id);

    return this.prisma.pedido.update({
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
  }

  // Deletar pedido
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.pedido.delete({
      where: { id },
    });
  }
}
