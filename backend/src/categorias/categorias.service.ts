import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todas as categorias (incluindo a lista de produtos atrelados)
  async findAll(somenteVisiveis?: boolean) {
    return this.prisma.categoria.findMany({
      where: somenteVisiveis ? { visivel: true } : {},
      include: {
        produtos: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Buscar uma categoria específica por ID
  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { produtos: true },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada.`);
    }

    return categoria;
  }

  // Criar uma nova categoria
  async create(data: { nome: string; visivel?: boolean }) {
    return this.prisma.categoria.create({
      data: {
        nome: data.nome,
        visivel: data.visivel ?? true,
      },
    });
  }

  // Atualizar o nome/visibilidade da categoria
  async update(id: string, data: { nome?: string; visivel?: boolean }) {
    await this.findOne(id);

    return this.prisma.categoria.update({
      where: { id },
      data,
    });
  }

  // Deletar uma categoria
  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.categoria.delete({
      where: { id },
    });
  }
}
