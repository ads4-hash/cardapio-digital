import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngredientesService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todos os ingredientes do estabelecimento com vínculos aos produtos
  async findAll(estabelecimentoId: string) {
    return this.prisma.ingrediente.findMany({
      where: { estabelecimentoId },
      include: {
        produtos: {
          include: { produto: true },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Buscar um ingrediente por ID (sempre dentro do estabelecimento)
  async findOne(estabelecimentoId: string, id: string) {
    const ingrediente = await this.prisma.ingrediente.findUnique({
      where: { id },
      include: {
        produtos: { include: { produto: true } },
      },
    });

    if (!ingrediente || ingrediente.estabelecimentoId !== estabelecimentoId) {
      throw new NotFoundException(`Ingrediente com ID ${id} não encontrado.`);
    }

    return ingrediente;
  }

  // Criar um ingrediente
  async create(estabelecimentoId: string, data: { nome: string }) {
    return this.prisma.ingrediente.create({
      data: {
        nome: data.nome,
        estabelecimentoId,
      },
    });
  }

  // Atualizar um ingrediente
  async update(estabelecimentoId: string, id: string, data: { nome?: string }) {
    await this.findOne(estabelecimentoId, id);

    return this.prisma.ingrediente.update({
      where: { id },
      data,
    });
  }

  // Remover um ingrediente
  async remove(estabelecimentoId: string, id: string) {
    await this.findOne(estabelecimentoId, id);

    return this.prisma.ingrediente.delete({
      where: { id },
    });
  }
}
