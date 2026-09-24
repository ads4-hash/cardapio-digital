import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // Painel admin: pedidos sempre do estabelecimento do usuário autenticado
  @UseGuards(AuthGuard)
  @Get()
  findAll(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.pedidosService.findAll(usuario.estabelecimentoId);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.pedidosService.findOne(usuario.estabelecimentoId, id);
  }

  // Acompanhamento público: retorna dados mínimos do pedido (ID é UUID não adivinhável)
  @Get(':id/rastrear')
  rastrear(@Param('id') id: string) {
    return this.pedidosService.rastrear(id);
  }

  // Criação de pedido é pública (o cliente faz o pedido sem login); o slug do
  // estabelecimento define de qual cardápio vêm os itens.
  @Post()
  create(@Body() dto: CreatePedidoDto) {
    return this.pedidosService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/status')
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
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.pedidosService.remove(usuario.estabelecimentoId, id);
  }
}
