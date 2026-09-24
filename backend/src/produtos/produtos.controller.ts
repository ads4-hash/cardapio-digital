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
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

@Controller('produtos')
export class ProdutosController {
  constructor(
    private readonly produtosService: ProdutosService,
    private readonly jwtService: JwtService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Público: retorna os produtos do estabelecimento (?slug=). Sem um token
  // válido, devolve apenas produtos de categorias visíveis (não vaza itens
  // de categorias ocultas).
  @Get()
  async findAll(
    @Query('slug') slug: string,
    @Query('categoriaId') categoriaId?: string,
    @Req() request?: Request,
  ) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    const ehAdmin = await this.temTokenValido(request);
    return this.produtosService.findAll(
      estabelecimento.id,
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

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.produtosService.findOne(usuario.estabelecimentoId, id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateProdutoDto,
  ) {
    return this.produtosService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateProdutoDto,
  ) {
    return this.produtosService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.produtosService.remove(usuario.estabelecimentoId, id);
  }
}
