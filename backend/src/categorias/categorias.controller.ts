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
import type { Request } from 'express';
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
    private readonly jwtService: JwtService,
  ) {}

  // Público: retorna as categorias do estabelecimento (?slug=). Sem um token
  // válido do próprio estabelecimento, devolve apenas as visíveis — igual a
  // GET /produtos, para que o cardápio público não exponha categorias que o
  // admin escondeu só porque o cliente esqueceu o parâmetro.
  @Get()
  @ApiOperation({
    summary: 'Lista as categorias (público, com filtro por visibilidade)',
    description: [
      'Alimenta o cardápio público. Sem `Authorization`, a listagem vem **filtrada**:',
      'categorias ocultas (`visivel=false`) não aparecem. Com um token do **próprio**',
      'estabelecimento, tudo volta. O token de outro estabelecimento é ignorado.',
    ].join('\n'),
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: [CategoriaDto] })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Slug não informado ou desconhecido.',
  })
  async findAll(@Query('slug') slug: string, @Req() request?: Request) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    const ehAdmin = (await this.tenantDoToken(request)) === estabelecimento.id;
    return this.categoriasService.findAll(
      estabelecimento.id,
      ehAdmin ? undefined : true,
    );
  }

  // Só trata como admin quem apresenta um JWT válido **e** do mesmo
  // estabelecimento resolvido pelo slug — validar o token sem comparar o
  // `estabelecimentoId` deixaria um admin de outro tenant enxergar a
  // listagem sem filtro de visibilidade (mesmo critério de GET /produtos).
  private async tenantDoToken(request?: Request): Promise<string | null> {
    const [tipo, token] = request?.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) return null;
    try {
      const payload = await this.jwtService.verifyAsync<{
        estabelecimentoId?: string;
      }>(token);
      return payload.estabelecimentoId ?? null;
    } catch {
      return null;
    }
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
