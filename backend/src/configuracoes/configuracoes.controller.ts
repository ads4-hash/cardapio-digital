import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfiguracoesService } from './configuracoes.service';
import { AtualizarCardapioDto } from './dto/atualizar-cardapio.dto';
import { AtualizarConfiguracaoDto } from './dto/atualizar-configuracao.dto';
import { AtualizarTaxaEntregaDto } from './dto/atualizar-taxa-entrega.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import {
  AceitandoPedidosDto,
  TaxaEntregaDto,
  VisualCardapioDto,
} from './dto/respostas-configuracoes.dto';

@ApiTags('configuracoes')
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
  @ApiOperation({
    summary: 'Estado online/offline do cardápio (público)',
    description:
      'Quando `aceitandoPedidos` é false, o cliente vê o cardápio bloqueado e não consegue montar pedido.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: AceitandoPedidosDto })
  @ApiBadRequestResponse({
    type: RespostaErroDto,
    description: 'Slug não informado ou desconhecido.',
  })
  async obterAceitandoPedidos(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterAceitandoPedidos(estabelecimentoId);
  }

  // Alternado pelo admin (botão online/offline) — somente autenticado
  @UseGuards(AuthGuard)
  @Patch('aceitando-pedidos')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Liga ou desliga os pedidos (painel)',
    description:
      'Altera sempre no estabelecimento do token, ignorando qualquer `slug`.',
  })
  @ApiBody({ type: AtualizarConfiguracaoDto })
  @ApiOkResponse({ type: AceitandoPedidosDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
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
  @ApiOperation({
    summary: 'Taxa de entrega (público)',
    description:
      'O carrinho do cliente soma este valor quando a entrega é escolhida.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: TaxaEntregaDto })
  @ApiBadRequestResponse({ type: RespostaErroDto })
  async obterTaxaEntrega(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterTaxaEntrega(estabelecimentoId);
  }

  // Personalização visual do cardápio (cor, logo, tema) — pública, p/ clientes
  @Get('cardapio')
  @ApiOperation({
    summary: 'Identidade visual do cardápio (público)',
    description:
      'Cor, logo, capa e tema que o cardápio público aplica no carregamento.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: VisualCardapioDto })
  @ApiBadRequestResponse({ type: RespostaErroDto })
  async obterVisualCardapio(@Query('slug') slug?: string) {
    const estabelecimentoId = await this.resolverEstabelecimentoId(slug);
    return this.configuracoesService.obterVisualCardapio(estabelecimentoId);
  }

  // Salva a personalização visual (somente admin) — PATCH
  @UseGuards(AuthGuard)
  @Patch('cardapio')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Salva a identidade visual do cardápio',
    description:
      'PATCH de verdade: só os campos enviados mudam. Enviar `null` em `cor`, `logoUrl` ou `capaUrl` remove a personalização.',
  })
  @ApiBody({ type: AtualizarCardapioDto })
  @ApiOkResponse({ type: VisualCardapioDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Define a taxa de entrega',
    description: 'Em reais. `0` deixa a entrega grátis.',
  })
  @ApiBody({ type: AtualizarTaxaEntregaDto })
  @ApiOkResponse({ type: TaxaEntregaDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
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
