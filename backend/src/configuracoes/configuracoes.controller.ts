import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ConfiguracoesService } from './configuracoes.service';
import { AtualizarCardapioDto } from './dto/atualizar-cardapio.dto';
import { AtualizarConfiguracaoDto } from './dto/atualizar-configuracao.dto';
import { AtualizarTaxaEntregaDto } from './dto/atualizar-taxa-entrega.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(
    private readonly configuracoesService: ConfiguracoesService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Consultas públicas usam o slug para saber de qual estabelecimento ler
  private async resolverEstabelecimentoId(slug?: string): Promise<string> {
    const estabelecimento = await this.estabelecimentos.porSlug(
      slug?.trim() ?? '',
    );
    return estabelecimento.id;
  }

  // Escopo do admin: sempre o estabelecimento do usuário autenticado
  private estabelecimentoDoUsuario(usuario: UsuarioAutenticado): string {
    return usuario.estabelecimentoId;
  }

  // Consulta pelo cliente para saber se pode adicionar itens / fazer pedidos
  @Get('aceitando-pedidos')
  async obterAceitandoPedidos(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterAceitandoPedidos(estabelecimentoId);
  }

  // Alternado pelo admin (botão online/offline) — somente autenticado
  @UseGuards(AuthGuard)
  @Patch('aceitando-pedidos')
  definirAceitandoPedidos(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarConfiguracaoDto,
  ) {
    return this.configuracoesService.definirAceitandoPedidos(
      this.estabelecimentoDoUsuario(usuario),
      dto.aceitandoPedidos,
    );
  }

  // Taxa cobrada em entregas — consultada pelo cliente no carrinho
  @Get('taxa-entrega')
  async obterTaxaEntrega(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterTaxaEntrega(estabelecimentoId);
  }

  // Personalização visual do cardápio (cor, logo, tema) — pública, p/ clientes
  @Get('cardapio')
  async obterVisualCardapio(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterVisualCardapio(estabelecimentoId);
  }

  // Salva a personalização visual (somente admin) — PATCH
  @UseGuards(AuthGuard)
  @Patch('cardapio')
  definirVisualCardapio(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarCardapioDto,
  ) {
    return this.configuracoesService.definirVisualCardapio(
      this.estabelecimentoDoUsuario(usuario),
      dto,
    );
  }

  // Valor definido pelo admin na tela de Faturamento — somente autenticado
  @UseGuards(AuthGuard)
  @Patch('taxa-entrega')
  definirTaxaEntrega(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarTaxaEntregaDto,
  ) {
    return this.configuracoesService.definirTaxaEntrega(
      this.estabelecimentoDoUsuario(usuario),
      dto.taxaEntrega,
    );
  }
}
