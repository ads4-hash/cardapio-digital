import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todas as categorias do estabelecimento (incluindo produtos atrelados)
  async findAll(estabelecimentoId: string, somenteVisiveis?: boolean) {
    return this.prisma.categoria.findMany({
      where: {
        estabelecimentoId,
        ...(somenteVisiveis ? { visivel: true } : {}),
      },
      include: {
        produtos: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Buscar uma categoria específica por ID (sempre dentro do estabelecimento)
  async findOne(estabelecimentoId: string, id: string) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { produtos: true },
    });

    if (!categoria || categoria.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada.`);
    }

    return categoria;
  }

  // Criar uma nova categoria no estabelecimento
  async create(
    estabelecimentoId: string,
    data: { nome: string; visivel?: boolean },
  ) {
    return this.prisma.categoria.create({
      data: {
        nome: data.nome,
        visivel: data.visivel ?? true,
        estabelecimentoId,
      },
    });
  }

  // Atualizar o nome/visibilidade da categoria
  async update(
    estabelecimentoId: string,
    id: string,
    data: { nome?: string; visivel?: boolean },
  ) {
    await this.findOne(estabelecimentoId, id);

    return this.prisma.categoria.update({
      where: { id },
      data,
    });
  }

  // Deletar uma categoria
  async remove(estabelecimentoId: string, id: string) {
    await this.findOne(estabelecimentoId, id);

    return this.prisma.categoria.delete({
      where: { id },
    });
  }
}
