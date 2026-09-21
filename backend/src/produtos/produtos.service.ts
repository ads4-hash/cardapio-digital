import { Injectable, NotFoundException } from '@nestjs/common';
import { unlinkSync } from 'fs';
import { join } from 'path';
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

  // Listar produtos (opcional filtrar por categoria e por visibilidade)
  async findAll(categoriaId?: string, somenteVisiveis?: boolean) {
    return this.prisma.produto.findMany({
      where: {
        ...(categoriaId ? { categoriaId } : {}),
        ...(somenteVisiveis ? { categoria: { visivel: true } } : {}),
      },
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
    const atual = await this.findOne(id);

    // Se a imagem foi trocada, remove o arquivo antigo do disco
    if (data.imagemUrl !== undefined && data.imagemUrl !== atual.imagemUrl) {
      this.removerImagemDoDisco(atual.imagemUrl);
    }

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
    const produto = await this.findOne(id);
    this.removerImagemDoDisco(produto.imagemUrl);

    return this.prisma.produto.delete({
      where: { id },
    });
  }

  // Apaga do disco imagens locais (/uploads/...) que ficaram órfãs
  private removerImagemDoDisco(imagemUrl?: string | null): void {
    if (!imagemUrl || !imagemUrl.startsWith('/uploads/')) return;
    try {
      unlinkSync(join(process.cwd(), imagemUrl));
    } catch {
      // arquivo já pode ter sido removido pelo próprio usuário
    }
  }
}
