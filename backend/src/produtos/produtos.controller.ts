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
import { ProdutosService } from './produtos.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import { ProdutoDto } from './dto/respostas-produto.dto';

@ApiTags('produtos')
@Controller('produtos')
export class ProdutosController {
  constructor(
    private readonly produtosService: ProdutosService,
    private readonly jwtService: JwtService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Público: retorna os produtos do estabelecimento (?slug=). Sem um token
  // válido do próprio estabelecimento, devolve apenas produtos de categorias
  // visíveis (não vaza itens de categorias ocultas para admins de outros tenants).
  @Get()
  @ApiOperation({
    summary: 'Lista os produtos (público, com filtro por visibilidade)',
    description: [
      'Alimenta o cardápio público. Sem `Authorization`, a listagem vem **filtrada**:',
      'produtos de categorias ocultas não aparecem. Com um token do **próprio**',
      'estabelecimento, tudo volta. O token de outro estabelecimento é ignorado.',
      '',
      'O token é opcional aqui de propósito — o mesmo endpoint serve ao cliente',
      '(anônimo) e ao painel (autenticado), sem duplicar rota.',
    ].join('\n'),
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiQuery({
    name: 'categoriaId',
    required: false,
    description: 'Filtra por uma categoria específica.',
  })
  @ApiOkResponse({ type: [ProdutoDto] })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Slug não informado ou desconhecido.',
  })
  async findAll(
    @Query('slug') slug: string,
    @Query('categoriaId') categoriaId?: string,
    @Req() request?: Request,
  ) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    const ehAdmin = (await this.tenantDoToken(request)) === estabelecimento.id;
    return this.produtosService.findAll(
      estabelecimento.id,
      categoriaId,
      ehAdmin ? undefined : true,
    );
  }

  // Só trata como admin quem apresenta um JWT válido **e** do mesmo
  // estabelecimento resolvido pelo slug — validar o token sem comparar o
  // `estabelecimentoId` deixaria um admin de outro tenant enxergar a
  // listagem sem filtro de visibilidade.
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
  @ApiOperation({ summary: 'Detalha um produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto.' })
  @ApiOkResponse({ type: ProdutoDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  findOne(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.produtosService.findOne(usuario.estabelecimentoId, id);
  }

  @UseGuards(AuthGuard)
  @Post()
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cria um produto',
    description:
      'O `slug` da URL é só do frontend: a imagem vem do `POST /upload` e entra aqui como `imagemUrl` (caminho relativo, ex.: `/uploads/abc.png`).',
  })
  @ApiBody({ type: CreateProdutoDto })
  @ApiCreatedResponse({ type: ProdutoDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Categoria informada não existe neste estabelecimento.',
  })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateProdutoDto,
  ) {
    return this.produtosService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Atualiza um produto',
    description: [
      'Campos omitidos continuam como estão. Enviar `ingredientes` substitui a lista inteira.',
      '',
      'Os grupos de escolha são recriados **apenas** quando `grupos` vem no payload:',
      'um PATCH que manda só preço ou só `ingredientes` preserva os grupos já cadastrados',
      '(teto/piso das marmitas).',
    ].join('\n'),
  })
  @ApiParam({ name: 'id', description: 'UUID do produto.' })
  @ApiBody({ type: UpdateProdutoDto })
  @ApiOkResponse({ type: ProdutoDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateProdutoDto,
  ) {
    return this.produtosService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Exclui um produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto.' })
  @ApiOkResponse({ description: 'Produto excluído. Corpo vazio.' })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.produtosService.remove(usuario.estabelecimentoId, id);
  }
}
