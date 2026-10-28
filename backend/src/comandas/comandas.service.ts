import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

function gerarCodigoComanda() {
  const hex = randomBytes(3).toString('hex').toUpperCase();
  return `CM-${hex}`;
}

@Injectable()
export class ComandasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(estabelecimentoId: string) {
    const comandas = await this.prisma.comanda.findMany({
      where: { estabelecimentoId, status: 'ABERTA' },
      orderBy: { createdAt: 'asc' },
      include: {
        mesa: true,
        pedidos: {
          include: {
            itens: {
              include: {
                produto: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return comandas.map((comanda) => {
      const total = comanda.pedidos.reduce((soma, pedido) => {
        const valor =
          typeof pedido.total === 'object' && 'toNumber' in pedido.total
            ? (pedido.total as any).toNumber()
            : Number(pedido.total);
        return soma + valor;
      }, 0);

      return {
        ...comanda,
        total,
      };
    });
  }

  async fechar(estabelecimentoId: string, comandaId: string, fechadoPorId?: string) {
    const comanda = await this.prisma.comanda.findFirst({
      where: { id: comandaId, estabelecimentoId },
      include: { mesa: true },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    if (comanda.status !== 'ABERTA') {
      throw new BadRequestException('Somente comandas abertas podem ser fechadas.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.comanda.update({
        where: { id: comanda.id },
        data: {
          status: 'FECHADA',
          fechadoPorId: fechadoPorId ?? null,
          fechadoEm: new Date(),
        },
      });

      await tx.mesa.update({
        where: { id: comanda.mesaId },
        data: {
          status: 'LIVRE',
        },
      });

      return { ok: true };
    });
  }

  async obterPorId(estabelecimentoId: string, comandaId: string) {
    const comanda = await this.prisma.comanda.findFirst({
      where: { id: comandaId, estabelecimentoId },
      include: {
        mesa: true,
        pedidos: {
          include: {
            itens: {
              include: {
                produto: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    return comanda;
  }

  async garantirComandaAberta(params: {
    estabelecimentoId: string;
    mesaId: string;
    numeroMesa: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const mesa = await tx.mesa.findFirst({
        where: { id: params.mesaId, estabelecimentoId: params.estabelecimentoId },
      });

      if (!mesa) {
        throw new NotFoundException('Mesa não encontrada.');
      }

      const comandaAberta = await tx.comanda.findFirst({
        where: {
          mesaId: mesa.id,
          estabelecimentoId: params.estabelecimentoId,
          status: 'ABERTA',
        },
      });

      if (comandaAberta) {
        return comandaAberta;
      }

      const codigo = gerarCodigoComanda();
      const comanda = await tx.comanda.create({
        data: {
          codigo,
          mesaId: mesa.id,
          estabelecimentoId: params.estabelecimentoId,
          status: 'ABERTA',
        },
      });

      await tx.mesa.update({
        where: { id: mesa.id },
        data: { status: 'OCUPADA' },
      });

      return comanda;
    });
  }
}
