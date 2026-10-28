import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MesasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAdmin(estabelecimentoId: string) {
    return this.prisma.mesa.findMany({
      where: { estabelecimentoId },
      orderBy: { numero: 'asc' },
    });
  }

  async criar(estabelecimentoId: string, numero: number) {
    if (!Number.isInteger(numero) || numero < 1) {
      throw new BadRequestException('Número da mesa inválido.');
    }

    const existente = await this.prisma.mesa.findUnique({
      where: {
        estabelecimentoId_numero: {
          estabelecimentoId,
          numero,
        },
      },
    });

    if (existente) {
      throw new ConflictException('Já existe uma mesa com este número.');
    }

    return this.prisma.mesa.create({
      data: {
        numero,
        estabelecimentoId,
        status: 'LIVRE',
      },
    });
  }

  async remover(estabelecimentoId: string, id: string) {
    const mesa = await this.prisma.mesa.findFirst({
      where: { id, estabelecimentoId },
    });

    if (!mesa) {
      throw new NotFoundException('Mesa não encontrada.');
    }

    const comandaAberta = await this.prisma.comanda.findFirst({
      where: { mesaId: id, status: 'ABERTA' },
    });

    if (comandaAberta) {
      throw new BadRequestException(
        'Não é possível remover uma mesa com comanda aberta.',
      );
    }

    await this.prisma.mesa.delete({ where: { id } });
    return { ok: true };
  }

  async listarLivres(slug: string) {
    const estabelecimento = await this.prisma.estabelecimento.findUnique({
      where: { slug },
    });

    if (!estabelecimento) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const mesas = await this.prisma.mesa.findMany({
      where: { estabelecimentoId: estabelecimento.id },
      orderBy: { numero: 'asc' },
      include: {
        comandas: {
          where: { status: 'ABERTA' },
          take: 1,
        },
      },
    });

    return mesas
      .filter((mesa) => mesa.comandas.length === 0 || mesa.status === 'LIVRE')
      .map((mesa) => ({
        id: mesa.id,
        numero: mesa.numero,
        status: 'LIVRE',
      }));
  }
}
