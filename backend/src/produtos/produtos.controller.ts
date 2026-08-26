import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProdutosService } from './produtos.service';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  findAll(@Query('categoriaId') categoriaId?: string) {
    return this.produtosService.findAll(categoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produtosService.findOne(id);
  }

  @Post()
  create(
    @Body()
    dto: {
      nome: string;
      descricao?: string;
      preco: number;
      imagemUrl?: string;
      categoriaId: string;
    },
  ) {
    return this.produtosService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    dto: {
      nome?: string;
      descricao?: string;
      preco?: number;
      imagemUrl?: string;
      categoriaId?: string;
    },
  ) {
    return this.produtosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produtosService.remove(id);
  }
}