import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarCardapioDto } from './dto/atualizar-cardapio.dto';
import type { PixConfiguracao, TipoChavePix } from '@projetinho/contratos';

// Chave da configuração que indica se o estabelecimento aceita pedidos
export const CHAVE_ACEITANDO_PEDIDOS = 'aceitando_pedidos';
// Chave do valor cobrado em cada entrega (definido pelo admin no Faturamento)
export const CHAVE_TAXA_ENTREGA = 'taxa_entrega';
// Personalização visual do cardápio (cor principal, logo e tema padrão)
export const CHAVE_CARDAPIO_COR = 'cardapio_cor';
export const CHAVE_CARDAPIO_LOGO = 'cardapio_logo';
export const CHAVE_CARDAPIO_TEMA = 'cardapio_tema';
export const CHAVE_CARDAPIO_CAPA = 'cardapio_capa';
// Dados Pix que o cliente usa para pagar quando escolhe Pix no checkout
export const CHAVE_PIX_TIPO_CHAVE = 'pix_tipo_chave';
export const CHAVE_PIX_CHAVE = 'pix_chave';
export const CHAVE_PIX_TITULAR = 'pix_titular';
export const CHAVE_PIX_INSTITUICAO = 'pix_instituicao';
export const CHAVE_PIX_QR = 'pix_qr';

// Tipos de chave Pix válidos (Banco Central). Usado para validar o valor lido
// do banco antes de devolver ao cliente, já que a tabela é chave-valor livre.
const TIPOS_CHAVE_PIX: TipoChavePix[] = [
  'CPF',
  'CNPJ',
  'TELEFONE',
  'EMAIL',
  'ALEATORIA',
];

export interface VisualCardapioPublico {
  cor: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  tema: 'claro' | 'escuro' | 'auto';
}

// Todas as configurações são escopadas por estabelecimento (tenant): cada casa
// tem seus próprios valores de aceitação de pedidos, taxa de entrega e visual.
@Injectable()
export class ConfiguracoesService {
  constructor(private readonly prisma: PrismaService) {}

  // Estado atual (padrão: aceitando pedidos) — GET público
  async obterAceitandoPedidos(estabelecimentoId: string): Promise<{
    aceitandoPedidos: boolean;
  }> {
    const regra = await this.prisma.configuracao.findUnique({
      where: this.chaveDe(estabelecimentoId, CHAVE_ACEITANDO_PEDIDOS),
    });
    return { aceitandoPedidos: regra ? regra.valor === 'true' : true };
  }

  // Altera o estado (somente admin) — PATCH
  async definirAceitandoPedidos(
    estabelecimentoId: string,
    aceitandoPedidos: boolean,
  ): Promise<{ aceitandoPedidos: boolean }> {
    await this.prisma.configuracao.upsert({
      where: this.chaveDe(estabelecimentoId, CHAVE_ACEITANDO_PEDIDOS),
      create: {
        estabelecimentoId,
        chave: CHAVE_ACEITANDO_PEDIDOS,
        valor: String(aceitandoPedidos),
      },
      update: { valor: String(aceitandoPedidos) },
    });
    return { aceitandoPedidos };
  }

  // Taxa de entrega atual (padrão: R$ 0,00) — GET público
  async obterTaxaEntrega(estabelecimentoId: string): Promise<{
    taxaEntrega: number;
  }> {
    const regra = await this.prisma.configuracao.findUnique({
      where: this.chaveDe(estabelecimentoId, CHAVE_TAXA_ENTREGA),
    });
    const valor = regra ? Number(regra.valor) : 0;
    return { taxaEntrega: Number.isFinite(valor) && valor > 0 ? valor : 0 };
  }

  // Altera a taxa de entrega (somente admin) — PATCH
  async definirTaxaEntrega(
    estabelecimentoId: string,
    taxaEntrega: number,
  ): Promise<{ taxaEntrega: number }> {
    const valor = Number(taxaEntrega);
    const seguro = Number.isFinite(valor) && valor > 0 ? valor : 0;
    await this.prisma.configuracao.upsert({
      where: this.chaveDe(estabelecimentoId, CHAVE_TAXA_ENTREGA),
      create: {
        estabelecimentoId,
        chave: CHAVE_TAXA_ENTREGA,
        valor: String(seguro),
      },
      update: { valor: String(seguro) },
    });
    return { taxaEntrega: seguro };
  }

  // Personalização atual do cardápio (valores padrão quando nada foi definido)
  // — GET público, para que clientes recebam a identidade visual do tenant
  async obterVisualCardapio(
    estabelecimentoId: string,
  ): Promise<VisualCardapioPublico> {
    const [cor, logo, capa, tema] = await Promise.all([
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_CARDAPIO_COR),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_CARDAPIO_LOGO),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_CARDAPIO_CAPA),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_CARDAPIO_TEMA),
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
    estabelecimentoId: string,
    dto: AtualizarCardapioDto,
  ): Promise<VisualCardapioPublico> {
    await this.definirConfig(estabelecimentoId, CHAVE_CARDAPIO_COR, dto.cor);
    await this.definirConfig(
      estabelecimentoId,
      CHAVE_CARDAPIO_LOGO,
      dto.logoUrl,
    );
    await this.definirConfig(estabelecimentoId, CHAVE_CARDAPIO_TEMA, dto.tema);
    await this.definirConfig(
      estabelecimentoId,
      CHAVE_CARDAPIO_CAPA,
      dto.capaUrl,
    );
    return this.obterVisualCardapio(estabelecimentoId);
  }

  // Dados Pix do estabelecimento (GET público). O cliente usa estas
  // informações para pagar quando escolhe Pix no checkout — por isso o
  // QR Code e o titular ficam aqui e não em uma tabela nova: a chave-valor
  // já cobre os campos e evita migration.
  async obterPix(estabelecimentoId: string): Promise<PixConfiguracao> {
    const [tipoChave, chave, titular, instituicao, qr] = await Promise.all([
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_PIX_TIPO_CHAVE),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_PIX_CHAVE),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_PIX_TITULAR),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_PIX_INSTITUICAO),
      }),
      this.prisma.configuracao.findUnique({
        where: this.chaveDe(estabelecimentoId, CHAVE_PIX_QR),
      }),
    ]);
    return {
      tipoChave:
        tipoChave && TIPOS_CHAVE_PIX.includes(tipoChave.valor as TipoChavePix)
          ? (tipoChave.valor as TipoChavePix)
          : null,
      chave: chave?.valor || null,
      titular: titular?.valor || null,
      instituicao: instituicao?.valor || null,
      qrUrl: qr?.valor || null,
    };
  }

  // Salva os dados Pix (somente admin) — PATCH: só os campos enviados mudam
  // (undefined preserva; null/vazio limpa, graças ao definirConfig)
  async definirPix(
    estabelecimentoId: string,
    dto: {
      tipoChave?: TipoChavePix | null;
      chave?: string | null;
      titular?: string | null;
      instituicao?: string | null;
      qrUrl?: string | null;
    },
  ): Promise<PixConfiguracao> {
    await this.definirConfig(
      estabelecimentoId,
      CHAVE_PIX_TIPO_CHAVE,
      dto.tipoChave,
    );
    await this.definirConfig(estabelecimentoId, CHAVE_PIX_CHAVE, dto.chave);
    await this.definirConfig(estabelecimentoId, CHAVE_PIX_TITULAR, dto.titular);
    await this.definirConfig(
      estabelecimentoId,
      CHAVE_PIX_INSTITUICAO,
      dto.instituicao,
    );
    await this.definirConfig(estabelecimentoId, CHAVE_PIX_QR, dto.qrUrl);
    return this.obterPix(estabelecimentoId);
  }

  private chaveDe(estabelecimentoId: string, chave: string) {
    return { estabelecimentoId_chave: { estabelecimentoId, chave } };
  }

  // Grava/atualiza uma chave, removendo a linha quando o valor for nulo/vazio
  private async definirConfig(
    estabelecimentoId: string,
    chave: string,
    valor: string | null | undefined,
  ): Promise<void> {
    if (valor === undefined) return;
    const normalizado = valor === null ? '' : valor.trim();
    if (!normalizado) {
      await this.prisma.configuracao.deleteMany({
        where: { estabelecimentoId, chave },
      });
      return;
    }
    await this.prisma.configuracao.upsert({
      where: this.chaveDe(estabelecimentoId, chave),
      create: { estabelecimentoId, chave, valor: normalizado },
      update: { valor: normalizado },
    });
  }
}
