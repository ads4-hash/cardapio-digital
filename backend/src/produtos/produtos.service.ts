import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todos os produtos (com opção de filtrar por categoria)
  async findAll(categoriaId?: string) {
    return this.prisma.produto.findMany({
      where: categoriaId ? { categoriaId } : {},
      include: {
        categoria: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar um único produto por ID
  async findOne(id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: { categoria: true },
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
  }) {
    return this.prisma.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: Number(data.preco),
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
      },
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
    },
  ) {
    await this.findOne(id);

    return this.prisma.produto.update({
      where: { id },
      data: {
        ...data,
        preco: data.preco ? Number(data.preco) : undefined,
      },
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