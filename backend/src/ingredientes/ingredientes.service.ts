import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngredientesService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todos os ingredientes com vínculos aos produtos
  async findAll() {
    return this.prisma.ingrediente.findMany({
      include: {
        produtos: {
          include: { produto: true },
        },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Buscar um ingrediente por ID
  async findOne(id: string) {
    const ingrediente = await this.prisma.ingrediente.findUnique({
      where: { id },
      include: {
        produtos: { include: { produto: true } },
      },
    });

    if (!ingrediente) {
      throw new NotFoundException(`Ingrediente com ID ${id} não encontrado.`);
    }

    return ingrediente;
  }

  // Criar um ingrediente
  async create(data: { nome: string }) {
    return this.prisma.ingrediente.create({
      data: {
        nome: data.nome,
      },
    });
  }

  // Atualizar um ingrediente
  async update(id: string, data: { nome?: string }) {
    await this.findOne(id);

    return this.prisma.ingrediente.update({
      where: { id },
      data,
    });
  }

  // Remover um ingrediente
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.ingrediente.delete({
      where: { id },
    });
  }
}
