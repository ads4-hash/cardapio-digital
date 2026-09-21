import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Chave da configuração que indica se o estabelecimento aceita pedidos
export const CHAVE_ACEITANDO_PEDIDOS = 'aceitando_pedidos';
// Chave do valor cobrado em cada entrega (definido pelo admin no Faturamento)
export const CHAVE_TAXA_ENTREGA = 'taxa_entrega';

@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prisma: PrismaService) {}

  // Estado atual (padrão: aceitando pedidos) — GET público
  async obterAceitandoPedidos(): Promise<{ aceitandoPedidos: boolean }> {
    const regra = await this.prisma.configuracao.findUnique({
      where: { chave: CHAVE_ACEITANDO_PEDIDOS },
    });
    return { aceitandoPedidos: regra ? regra.valor === 'true' : true };
  }

  // Altera o estado (somente admin) — PATCH
  async definirAceitandoPedidos(
    aceitandoPedidos: boolean,
  ): Promise<{ aceitandoPedidos: boolean }> {
    await this.prisma.configuracao.upsert({
      where: { chave: CHAVE_ACEITANDO_PEDIDOS },
      create: {
        chave: CHAVE_ACEITANDO_PEDIDOS,
        valor: String(aceitandoPedidos),
      },
      update: { valor: String(aceitandoPedidos) },
    });
    return { aceitandoPedidos };
  }

  // Taxa de entrega atual (padrão: R$ 0,00) — GET público
  async obterTaxaEntrega(): Promise<{ taxaEntrega: number }> {
    const regra = await this.prisma.configuracao.findUnique({
      where: { chave: CHAVE_TAXA_ENTREGA },
    });
    const valor = regra ? Number(regra.valor) : 0;
    return { taxaEntrega: Number.isFinite(valor) && valor > 0 ? valor : 0 };
  }

  // Altera a taxa de entrega (somente admin) — PATCH
  async definirTaxaEntrega(
    taxaEntrega: number,
  ): Promise<{ taxaEntrega: number }> {
    const valor = Number(taxaEntrega);
    const seguro = Number.isFinite(valor) && valor > 0 ? valor : 0;
    await this.prisma.configuracao.upsert({
      where: { chave: CHAVE_TAXA_ENTREGA },
      create: {
        chave: CHAVE_TAXA_ENTREGA,
        valor: String(seguro),
      },
      update: { valor: String(seguro) },
    });
    return { taxaEntrega: seguro };
  }
}
