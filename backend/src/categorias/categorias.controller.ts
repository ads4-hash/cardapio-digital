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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import { CategoriaDto } from './dto/respostas-categoria.dto';

@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(
    private readonly categoriasService: CategoriasService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // ?somenteVisiveis=true retorna apenas as categorias visíveis p/ o cliente.
  // O slug identifica o estabelecimento (URL pública /cardapio/:slug).
  @Get()
  @ApiOperation({
    summary: 'Lista as categorias (público)',
    description:
      'Com `somenteVisiveis=true`, usada pelo cardápio público para não expor categorias ocultas. Sem o filtro, devolve todas.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiQuery({
    name: 'somenteVisiveis',
    required: false,
    description: '`true` devolve apenas as categorias visíveis ao cliente.',
    example: 'true',
  })
  @ApiOkResponse({ type: [CategoriaDto] })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Slug não informado ou desconhecido.',
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Detalha uma categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria.' })
  @ApiOkResponse({ type: CategoriaDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.categoriasService.findOne(usuario.estabelecimentoId, id);
  }

  @UseGuards(AuthGuard)
  @Post()
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cria uma categoria',
    description:
      'Nasce visível; o admin pode esconder depois com `PATCH /categorias/:id`.',
  })
  @ApiBody({ type: CreateCategoriaDto })
  @ApiCreatedResponse({ type: CategoriaDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateCategoriaDto,
  ) {
    return this.categoriasService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Atualiza uma categoria (nome, visibilidade)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria.' })
  @ApiBody({ type: UpdateCategoriaDto })
  @ApiOkResponse({ type: CategoriaDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Exclui uma categoria',
    description:
      'Os produtos vinculados também são removidos (cascade no banco).',
  })
  @ApiParam({ name: 'id', description: 'UUID da categoria.' })
  @ApiOkResponse({ description: 'Categoria excluída. Corpo vazio.' })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.categoriasService.remove(usuario.estabelecimentoId, id);
  }
}
