import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeCompleto = {
    categoria: true,
    ingredientes: {
      include: {
        ingrediente: true,
      },
    },
  };

  // Listar todos os produtos (com opção de filtrar por categoria)
  async findAll(categoriaId?: string) {
    return this.prisma.produto.findMany({
      where: categoriaId ? { categoriaId } : {},
      include: this.includeCompleto,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar um único produto por ID
  async findOne(id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: this.includeCompleto,
    });

    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }

    return produto;
  }

  // Criar um novo produto
  async create(data: {
    nome: string;
    descricao?: string;
    preco: number;
    imagemUrl?: string;
    categoriaId: string;
    ingredientes?: { ingredienteId: string; precoAdicional?: number }[];
  }) {
    return this.prisma.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: Number(data.preco),
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
        ingredientes: data.ingredientes
          ? {
              create: data.ingredientes.map((i) => ({
                ingredienteId: i.ingredienteId,
                precoAdicional: Number(i.precoAdicional ?? 0),
              })),
            }
          : undefined,
      },
      include: this.includeCompleto,
    });
  }

  // Atualizar dados do produto
  async update(
    id: string,
    data: {
      nome?: string;
      descricao?: string;
      preco?: number;
      imagemUrl?: string;
      categoriaId?: string;
      ingredientes?: { ingredienteId: string; precoAdicional?: number }[];
    },
  ) {
    await this.findOne(id);

    return this.prisma.produto.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: data.preco !== undefined ? Number(data.preco) : undefined,
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
        ingredientes: data.ingredientes
          ? {
              deleteMany: {},
              create: data.ingredientes.map((i) => ({
                ingredienteId: i.ingredienteId,
                precoAdicional: Number(i.precoAdicional ?? 0),
              })),
            }
          : undefined,
      },
      include: this.includeCompleto,
    });
  }

  // Remover um produto
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.produto.delete({
      where: { id },
    });
  }
}
