import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  findAll() {
    return this.pedidosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pedidosService.findOne(id);
  }

  @Post()
  create(
    @Body()
    dto: {
      cliente: string;
      mesa?: string;
      itens: { produtoId: string; quantidade: number }[];
    },
  ) {
    return this.pedidosService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.pedidosService.updateStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pedidosService.remove(id);
  }
}
