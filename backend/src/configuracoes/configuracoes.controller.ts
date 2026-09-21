import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ConfiguracoesService } from './configuracoes.service';
import { AtualizarConfiguracaoDto } from './dto/atualizar-configuracao.dto';
import { AtualizarTaxaEntregaDto } from './dto/atualizar-taxa-entrega.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(private readonly configuracoesService: ConfiguracoesService) {}

  // Consultado pelo cliente para saber se pode adicionar itens / fazer pedidos
  @Get('aceitando-pedidos')
  obterAceitandoPedidos() {
    return this.configuracoesService.obterAceitandoPedidos();
  }

  // Alternado pelo admin (botão online/offline) — somente autenticado
  @UseGuards(AuthGuard)
  @Patch('aceitando-pedidos')
  definirAceitandoPedidos(@Body() dto: AtualizarConfiguracaoDto) {
    return this.configuracoesService.definirAceitandoPedidos(
      dto.aceitandoPedidos,
    );
  }

  // Taxa cobrada em entregas — consultada pelo cliente no carrinho
  @Get('taxa-entrega')
  obterTaxaEntrega() {
    return this.configuracoesService.obterTaxaEntrega();
  }

  // Valor definido pelo admin na tela de Faturamento — somente autenticado
  @UseGuards(AuthGuard)
  @Patch('taxa-entrega')
  definirTaxaEntrega(@Body() dto: AtualizarTaxaEntregaDto) {
    return this.configuracoesService.definirTaxaEntrega(dto.taxaEntrega);
  }
}
