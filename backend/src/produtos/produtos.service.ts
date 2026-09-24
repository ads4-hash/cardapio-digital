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

  // Listar produtos (opcional filtrar por categoria e por visibilidade),
  // sempre dentro de um único estabelecimento
  async findAll(
    estabelecimentoId: string,
    categoriaId?: string,
    somenteVisiveis?: boolean,
  ) {
    return this.prisma.produto.findMany({
      where: {
        estabelecimentoId,
        ...(categoriaId ? { categoriaId } : {}),
        ...(somenteVisiveis ? { categoria: { visivel: true } } : {}),
      },
      include: this.includeCompleto,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar um único produto por ID (sempre dentro do estabelecimento)
  async findOne(estabelecimentoId: string, id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: this.includeCompleto,
    });

    if (!produto || produto.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }

    return produto;
  }

  // Criar um novo produto
  async create(
    estabelecimentoId: string,
    data: {
      nome: string;
      descricao?: string;
      preco: number;
      imagemUrl?: string;
      categoriaId: string;
      ingredientes?: { ingredienteId: string; precoAdicional?: number }[];
    },
  ) {
    await this.validarCategoria(estabelecimentoId, data.categoriaId);
    await this.validarIngredientes(estabelecimentoId, data.ingredientes);

    return this.prisma.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        preco: Number(data.preco),
        imagemUrl: data.imagemUrl,
        categoriaId: data.categoriaId,
        estabelecimentoId,
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
    estabelecimentoId: string,
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
    const atual = await this.findOne(estabelecimentoId, id);

    if (data.categoriaId) {
      await this.validarCategoria(estabelecimentoId, data.categoriaId);
    }
    await this.validarIngredientes(estabelecimentoId, data.ingredientes);

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
  async remove(estabelecimentoId: string, id: string) {
    const produto = await this.findOne(estabelecimentoId, id);
    this.removerImagemDoDisco(produto.imagemUrl);

    return this.prisma.produto.delete({
      where: { id },
    });
  }

  // Impede vínculo com categoria de outro estabelecimento
  private async validarCategoria(
    estabelecimentoId: string,
    categoriaId: string,
  ): Promise<void> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { estabelecimentoId: true },
    });
    if (!categoria || categoria.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(
        `Categoria com ID ${categoriaId} não encontrada.`,
      );
    }
  }

  // Impede vínculo com ingrediente de outro estabelecimento
  private async validarIngredientes(
    estabelecimentoId: string,
    ingredientes?: { ingredienteId: string; precoAdicional?: number }[],
  ): Promise<void> {
    if (!ingredientes || ingredientes.length === 0) return;
    const ids = [...new Set(ingredientes.map((i) => i.ingredienteId))];
    const encontrados = await this.prisma.ingrediente.findMany({
      where: {
        id: { in: ids },
        estabelecimentoId,
      },
      select: { id: true },
    });
    if (encontrados.length !== ids.length) {
      throw new NotFoundException(
        'Um ou mais ingredientes informados não pertencem ao estabelecimento.',
      );
    }
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
