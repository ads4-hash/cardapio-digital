import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

@Controller('categorias')
export class CategoriasController {
  constructor(
    private readonly categoriasService: CategoriasService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // ?somenteVisiveis=true retorna apenas as categorias visíveis p/ o cliente.
  // O slug identifica o estabelecimento (URL pública /cardapio/:slug).
  @Get()
  async findAll(
    @Query('slug') slug: string,
    @Query('somenteVisiveis') somenteVisiveis?: string,
  ) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    const filtro = somenteVisiveis === 'true';
    return this.categoriasService.findAll(
      estabelecimento.id,
      filtro ? true : undefined,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.categoriasService.findOne(usuario.estabelecimentoId, id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateCategoriaDto,
  ) {
    return this.categoriasService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.categoriasService.remove(usuario.estabelecimentoId, id);
  }
}
