import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  // Buscar um ingrediente por ID (sempre dentro do estabelecimento).
  // Não há `GET /ingredientes/:id`, então o acesso é só interno (update/remove).
  private async findOne(estabelecimentoId: string, id: string) {
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
    const nome = data.nome.trim();
    if (!nome) {
      throw new BadRequestException('O nome do ingrediente é obrigatório.');
    }

    await this.garantirNomeUnico(estabelecimentoId, nome);

    return this.prisma.ingrediente.create({
      data: {
        nome,
        estabelecimentoId,
      },
    });
  }

  // Atualizar um ingrediente
  async update(estabelecimentoId: string, id: string, data: { nome?: string }) {
    await this.findOne(estabelecimentoId, id);

    if (data.nome === undefined) {
      return this.prisma.ingrediente.update({ where: { id }, data });
    }

    const nome = data.nome.trim();
    if (!nome) {
      throw new BadRequestException('O nome do ingrediente é obrigatório.');
    }

    await this.garantirNomeUnico(estabelecimentoId, nome, id);

    return this.prisma.ingrediente.update({ where: { id }, data: { nome } });
  }

  // Compara nomes ignorando caixa, acentos e espaços das pontas.
  private normalizarNome(nome: string): string {
    return nome
      .trim()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  // O SQLite (via Prisma) não suporta filtro case-insensitive
  // (`mode: 'insensitive'`), então buscamos os nomes do estabelecimento e
  // comparamos aqui. A lista é pequena (adicionais de um cardápio).
  private async garantirNomeUnico(
    estabelecimentoId: string,
    nome: string,
    ignorarId?: string,
  ): Promise<void> {
    const ingredientes = await this.prisma.ingrediente.findMany({
      where: { estabelecimentoId },
      select: { id: true, nome: true },
    });

    const alvo = this.normalizarNome(nome);
    const duplicado = ingredientes.find(
      (ing) => ing.id !== ignorarId && this.normalizarNome(ing.nome) === alvo,
    );

    if (duplicado) {
      throw new ConflictException(
        `Já existe um ingrediente chamado "${duplicado.nome}".`,
      );
    }
  }

  // Remover um ingrediente
  async remove(estabelecimentoId: string, id: string) {
    await this.findOne(estabelecimentoId, id);

    return this.prisma.ingrediente.delete({
      where: { id },
    });
  }
}
