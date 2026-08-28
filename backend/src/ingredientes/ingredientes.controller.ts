import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { IngredientesService } from './ingredientes.service';
import { CreateIngredienteDto, UpdateIngredienteDto } from './dto/create-ingrediente.dto';

@Controller('ingredientes')
export class IngredientesController {
  constructor(private readonly ingredientesService: IngredientesService) {}

  @Get()
  findAll() {
    return this.ingredientesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateIngredienteDto) {
    return this.ingredientesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateIngredienteDto) {
    return this.ingredientesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingredientesService.remove(id);
  }
}
