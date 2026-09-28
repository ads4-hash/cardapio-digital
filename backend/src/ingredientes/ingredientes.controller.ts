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
import { IngredientesService } from './ingredientes.service';
import {
  CreateIngredienteDto,
  UpdateIngredienteDto,
} from './dto/create-ingrediente.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';
import { RespostaErroDto } from '../common/dto/resposta-erro.dto';
import { IngredienteDto } from './dto/respostas-ingrediente.dto';

@ApiTags('ingredientes')
@Controller('ingredientes')
export class IngredientesController {
  constructor(
    private readonly ingredientesService: IngredientesService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Público: ingredientes do estabelecimento (~identificados pelo slug da URL)
  @Get()
  @ApiOperation({
    summary: 'Lista os ingredientes (público)',
    description:
      'Ingredientes disponíveis para o cliente personalizar os produtos do cardápio. Não exige autenticação.',
  })
  @ApiQuery({
    name: 'slug',
    required: true,
    description: 'Slug do estabelecimento.',
    example: 'pizzaria-do-ze',
  })
  @ApiOkResponse({ type: [IngredienteDto] })
  @ApiNotFoundResponse({
    type: RespostaErroDto,
    description: 'Slug não informado ou desconhecido.',
  })
  async findAll(@Query('slug') slug: string) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    return this.ingredientesService.findAll(estabelecimento.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cria um ingrediente',
    description:
      'Criar o ingrediente é passo 1; ligar ele a um produto (com o adicional de preço) é passo 2, no `POST /produtos`.',
  })
  @ApiBody({ type: CreateIngredienteDto })
  @ApiCreatedResponse({ type: IngredienteDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateIngredienteDto,
  ) {
    return this.ingredientesService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Atualiza um ingrediente' })
  @ApiParam({ name: 'id', description: 'UUID do ingrediente.' })
  @ApiBody({ type: UpdateIngredienteDto })
  @ApiOkResponse({ type: IngredienteDto })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateIngredienteDto,
  ) {
    return this.ingredientesService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Exclui um ingrediente' })
  @ApiParam({ name: 'id', description: 'UUID do ingrediente.' })
  @ApiOkResponse({ description: 'Ingrediente excluído. Corpo vazio.' })
  @ApiUnauthorizedResponse({ type: RespostaErroDto })
  @ApiNotFoundResponse({ type: RespostaErroDto })
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.ingredientesService.remove(usuario.estabelecimentoId, id);
  }
}
