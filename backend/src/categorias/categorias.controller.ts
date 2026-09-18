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

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  // ?somenteVisiveis=true retorna apenas as categorias visíveis p/ o cliente
  @Get()
  findAll(@Query('somenteVisiveis') somenteVisiveis?: string) {
    const filtro = somenteVisiveis === 'true';
    return this.categoriasService.findAll(filtro ? true : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.create(dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.categoriasService.update(id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}
