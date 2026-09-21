import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('produtos')
export class ProdutosController {
  constructor(
    private readonly produtosService: ProdutosService,
    private readonly jwtService: JwtService,
  ) {}

  // Público: retorna os produtos. Sem um token válido, devolve apenas produtos
  // de categorias visíveis (não vaza itens de categorias ocultas).
  @Get()
  async findAll(
    @Query('categoriaId') categoriaId?: string,
    @Req() request?: Request,
  ) {
    const ehAdmin = await this.temTokenValido(request);
    return this.produtosService.findAll(
      categoriaId,
      ehAdmin ? undefined : true,
    );
  }

  private async temTokenValido(request?: Request): Promise<boolean> {
    const [tipo, token] = request?.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) return false;
    try {
      await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      return false;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.produtosService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateProdutoDto) {
    return this.produtosService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProdutoDto) {
    return this.produtosService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.produtosService.remove(id);
  }
}
