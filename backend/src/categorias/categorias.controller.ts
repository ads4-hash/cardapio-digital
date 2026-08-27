import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @Post()
  create(@Body() dto: { nome: string }) {
    return this.categoriasService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { nome?: string }) {
    return this.categoriasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }
}
