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
import { IngredientesService } from './ingredientes.service';
import {
  CreateIngredienteDto,
  UpdateIngredienteDto,
} from './dto/create-ingrediente.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UsuarioAutenticado } from '../auth/current-user.decorator';
import { EstabelecimentosService } from '../estabelecimentos/estabelecimentos.service';

@Controller('ingredientes')
export class IngredientesController {
  constructor(
    private readonly ingredientesService: IngredientesService,
    private readonly estabelecimentos: EstabelecimentosService,
  ) {}

  // Público: ingredientes do estabelecimento (~identificados pelo slug da URL)
  @Get()
  async findAll(@Query('slug') slug: string) {
    const estabelecimento = await this.estabelecimentos.porSlug(slug);
    return this.ingredientesService.findAll(estabelecimento.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: CreateIngredienteDto,
  ) {
    return this.ingredientesService.create(usuario.estabelecimentoId, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() dto: UpdateIngredienteDto,
  ) {
    return this.ingredientesService.update(usuario.estabelecimentoId, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@CurrentUser() usuario: UsuarioAutenticado, @Param('id') id: string) {
    return this.ingredientesService.remove(usuario.estabelecimentoId, id);
  }
}
