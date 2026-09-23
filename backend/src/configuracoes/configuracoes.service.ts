import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarCardapioDto } from './dto/atualizar-cardapio.dto';

// Chave da configuração que indica se o estabelecimento aceita pedidos
export const CHAVE_ACEITANDO_PEDIDOS = 'aceitando_pedidos';
// Chave do valor cobrado em cada entrega (definido pelo admin no Faturamento)
export const CHAVE_TAXA_ENTREGA = 'taxa_entrega';
// Personalização visual do cardápio (cor principal, logo e tema padrão)
export const CHAVE_CARDAPIO_COR = 'cardapio_cor';
export const CHAVE_CARDAPIO_LOGO = 'cardapio_logo';
export const CHAVE_CARDAPIO_TEMA = 'cardapio_tema';
export const CHAVE_CARDAPIO_CAPA = 'cardapio_capa';

export interface VisualCardapioPublico {
  cor: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  tema: 'claro' | 'escuro' | 'auto';
}

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

  // Personalização atual do cardápio (valores padrão quando nada foi definido)
  // — GET público, para que clientes recebam a identidade visual
  async obterVisualCardapio(): Promise<VisualCardapioPublico> {
    const [cor, logo, capa, tema] = await Promise.all([
      this.prisma.configuracao.findUnique({
        where: { chave: CHAVE_CARDAPIO_COR },
      }),
      this.prisma.configuracao.findUnique({
        where: { chave: CHAVE_CARDAPIO_LOGO },
      }),
      this.prisma.configuracao.findUnique({
        where: { chave: CHAVE_CARDAPIO_CAPA },
      }),
      this.prisma.configuracao.findUnique({
        where: { chave: CHAVE_CARDAPIO_TEMA },
      }),
    ]);
    return {
      cor: cor?.valor || null,
      logoUrl: logo?.valor || null,
      capaUrl: capa?.valor || null,
      tema:
        tema?.valor === 'escuro' || tema?.valor === 'claro'
          ? tema.valor
          : 'auto',
    };
  }

  // Salva a personalização visual (somente admin) — PATCH
  async definirVisualCardapio(
    dto: AtualizarCardapioDto,
  ): Promise<VisualCardapioPublico> {
    await this.definirConfig(CHAVE_CARDAPIO_COR, dto.cor);
    await this.definirConfig(CHAVE_CARDAPIO_LOGO, dto.logoUrl);
    await this.definirConfig(CHAVE_CARDAPIO_TEMA, dto.tema);
    await this.definirConfig(CHAVE_CARDAPIO_CAPA, dto.capaUrl);
    return this.obterVisualCardapio();
  }

  // Grava/atualiza uma chave, removendo a linha quando o valor for nulo/vazio
  private async definirConfig(
    chave: string,
    valor: string | null | undefined,
  ): Promise<void> {
    if (valor === undefined) return;
    const normalizado = valor === null ? '' : valor.trim();
    if (!normalizado) {
      await this.prisma.configuracao.deleteMany({ where: { chave } });
      return;
    }
    await this.prisma.configuracao.upsert({
      where: { chave },
      create: { chave, valor: normalizado },
      update: { valor: normalizado },
    });
  }
}
