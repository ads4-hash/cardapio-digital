import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListarPedidosDto } from './dto/listar-pedidos.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import { PedidoDto, PedidoRastreioDto } from './dto/respostas-pedido.dto';

@ApiTags('pedidos')
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // Painel admin: pedidos sempre do estabelecimento do usuário autenticado
  @UseGuards(AuthGuard)
  @Get()
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Lista os pedidos do estabelecimento (painel)',
    description: [
      'Ordena do mais recente para o mais antigo. Sempre escopado no token: um admin',
      'não enxerga pedidos de outra casa, mesmo que mande o slug de outro estabelecimento.',
      '',
      '**Paginação opcional.** Sem parâmetros devolve a lista inteira (como sempre).',
      'Com `pagina` (e opcionalmente `tamanhoPagina`, padrão 50, máx. 200) devolve',
      'só a fatia pedida. `status` filtra por um status exato.',
    ].join('\n'),
  })
  @ApiOkResponse({ type: [PedidoDto] })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  findAll(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query() filtros: ListarPedidosDto,
  ) {
    return this.pedidosService.findAll(usuario.estabelecimentoId, filtros);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Detalha um pedido do estabelecimento' })
  @ApiParam({ name: 'id', description: 'UUID do pedido.' })
  @ApiOkResponse({ type: PedidoDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Pedido inexistente ou de outro estabelecimento.',
  })
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.pedidosService.findOne(usuario.estabelecimentoId, id);
  }

  // Acompanhamento público: retorna dados mínimos do pedido (ID é UUID não adivinhável)
  @Get(':id/rastrear')
  @ApiOperation({
    summary: 'Acompanha um pedido (público)',
    description:
      'É o que a tela /pedido/:id do cliente consulta. Não exige token e devolve só o necessário para o acompanhamento (sem o produto inteiro), incluindo o `slug` do estabelecimento para o cliente carregar o cardápio certo.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido, exibido ao cliente.' })
  @ApiOkResponse({ type: PedidoRastreioDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  rastrear(@Param('id') id: string) {
    return this.pedidosService.rastrear(id);
  }

  // Criação de pedido é pública (o cliente faz o pedido sem login); o slug do
  // estabelecimento define de qual cardápio vêm os itens.
  // O limite global (100/min) é permissivo demais para um endpoint que grava
  // pedido: sem isto, um script consegue inundar o painel do restaurante com
  // pedidos falsos. 20/min por IP ainda permite um fraquilo de picos de
  // movimento real, porque um cliente nunca faz 20 pedidos de uma vez.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post()
  @ApiOperation({
    summary: 'Cria um pedido (público)',
    description: [
      'O cliente faz o pedido sem conta. O `slugEstabelecimento` define de qual',
      'cardápio vêm os itens; preços e produtos são validados no servidor, então não',
      'dá para forjar preço pela requisição.',
      '',
      '`total` e `taxaEntrega` são calculados no servidor a partir do que foi pedido.',
    ].join('\n'),
  })
  @ApiBody({ type: CreatePedidoDto })
  @ApiCreatedResponse({ type: PedidoDto })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description:
      'Estabelecimento, produto ou ingrediente informado não existe.',
  })
  @ApiTooManyRequestsResponse({
    type: RespostaErroDto,
    description: 'Limite de 20/min por IP.',
  })
  create(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Muda o status de um pedido',
    description:
      'Usado pelos botões do painel. Cada mudança dispara o WebSocket `pedido.atualizado`, que atualiza a tela do cliente sem recarregar.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido.' })
  @ApiBody({ type: UpdatePedidoDto })
  @ApiOkResponse({ type: PedidoDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  updateStatus(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdatePedidoDto,
  ) {
    return this.pedidosService.updateStatus(
      usuario.estabelecimentoId,
      id,
      dto.status,
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Exclui um pedido',
    description: 'Dispara o WebSocket `pedido.removido`.',
  })
  @ApiParam({ name: 'id', description: 'UUID do pedido.' })
  @ApiOkResponse({
    description: 'Pedido excluído. O corpo da resposta é vazio.',
  })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.pedidosService.remove(usuario.estabelecimentoId, id);
  }
}
